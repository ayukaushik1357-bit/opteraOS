import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/departments.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string) {
    return this.prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
      include: {
        parentDepartment: { select: { id: true, name: true } },
        _count: { select: { teams: true, employees: true, jobs: true } },
      },
    });
  }

  async getTree(orgId: string) {
    return this.prisma.department.findMany({
      where: { organizationId: orgId, parentDepartmentId: null },
      include: {
        childDepartments: {
          include: {
            childDepartments: true,
            teams: true,
            employees: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
          },
        },
        teams: true,
        employees: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(orgId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: {
        parentDepartment: true,
        childDepartments: true,
        teams: true,
        employees: true,
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateDepartmentDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const dept = await this.prisma.department.create({
      data: {
        organizationId: orgId,
        parentDepartmentId: dto.parentDepartmentId || null,
        managerId: dto.managerId || null,
        name: dto.name.trim(),
        description: dto.description || null,
        status: dto.status || 'ACTIVE',
      },
      include: { parentDepartment: true },
    });

    await this.domainEvents.emit({
      eventName: 'department.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'department',
      resourceId: dept.id,
      newState: dept,
      requestId,
      source: 'departments-service',
      data: dept,
    });

    return dept;
  }

  async update(
    orgId: string,
    id: string,
    userId: string | null,
    dto: UpdateDepartmentDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);

    const updated = await this.prisma.department.update({
      where: { id },
      data: dto,
      include: { parentDepartment: true },
    });

    await this.domainEvents.emit({
      eventName: 'department.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'department',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'departments-service',
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
    await this.prisma.department.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'department.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'department',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'departments-service',
    });

    return { success: true, message: 'Department deleted' };
  }
}
