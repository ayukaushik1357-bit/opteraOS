import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateActivityDto, UpdateActivityDto, QueryActivitiesDto } from './dto/activities.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: QueryActivitiesDto = {}) {
    const {
      search,
      type,
      status,
      entityType,
      entityId,
      customerId,
      userId,
      page = 1,
      pageSize = 30,
    } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = { organizationId: orgId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (customerId) where.customerId = customerId;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true } },
          deal: { select: { id: true, title: true } },
        },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async findById(orgId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, organizationId: orgId },
      include: {
        user: true,
        createdBy: true,
        customer: true,
        lead: true,
        deal: true,
      },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateActivityDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const activity = await this.prisma.activity.create({
      data: {
        organizationId: orgId,
        type: dto.type || 'NOTE',
        title: dto.title,
        description: dto.description || null,
        entityType: dto.entityType || null,
        entityId: dto.entityId || null,
        customerId: dto.customerId || null,
        leadId: dto.leadId || null,
        dealId: dto.dealId || null,
        userId: dto.assignedUserId || userId || null,
        assignedUserId: dto.assignedUserId || null,
        createdById: userId || null,
        status: dto.status || 'COMPLETED',
        priority: dto.priority || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        completedAt: dto.status === 'COMPLETED' ? new Date() : null,
        metadata: dto.metadata || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'activity.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'activity',
      resourceId: activity.id,
      newState: activity,
      requestId,
      source: 'activities-service',
      data: activity,
    });

    return activity;
  }

  async update(
    orgId: string,
    id: string,
    userId: string | null,
    dto: UpdateActivityDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);

    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: dto.status === 'COMPLETED' && existing.status !== 'COMPLETED' ? new Date() : undefined,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'activity.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'activity',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'activities-service',
      data: updated,
    });

    return updated;
  }

  async delete(
    orgId: string,
    id: string,
    userId: string | null,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);
    await this.prisma.activity.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'activity.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'activity',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'activities-service',
    });

    return { success: true, message: 'Activity deleted' };
  }
}
