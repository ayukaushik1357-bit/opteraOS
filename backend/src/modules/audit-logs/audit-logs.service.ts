import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}
  async findAll(orgId: string, query: any = {}) {
    const { action, userId, resource, page = 1, pageSize = 50 } = query;
    const where: any = { organizationId: orgId };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { rows, total };
  }
  async log(orgId: string, userId: string | null, action: string, resource: string, resourceId?: string, metadata?: any) {
    return this.prisma.auditLog.create({ data: { organizationId: orgId, userId, action, resource, resourceId, metadata } });
  }
}
