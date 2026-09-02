import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActorType } from '@prisma/client';

export interface QueryAuditLogsDto {
  search?: string;
  action?: string;
  actorType?: ActorType;
  userId?: string;
  resource?: string;
  resourceId?: string;
  requestId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string, query: QueryAuditLogsDto = {}) {
    const {
      search,
      action,
      actorType,
      userId,
      resource,
      resourceId,
      requestId,
      page = 1,
      pageSize = 50,
    } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = { organizationId: orgId };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (actorType) where.actorType = actorType;
    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    if (resourceId) where.resourceId = resourceId;
    if (requestId) where.requestId = requestId;
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async log(
    orgId: string,
    userId: string | null,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: any,
    actorType: ActorType = ActorType.USER,
    oldState?: any,
    newState?: any,
    requestId?: string,
    source?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        actorType,
        action,
        resource,
        resourceId: resourceId || null,
        oldState: oldState || null,
        newState: newState || null,
        requestId: requestId || null,
        source: source || 'api',
        metadata: metadata || null,
      },
    });
  }
}
