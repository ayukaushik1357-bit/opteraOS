import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}
  async findAll(orgId: string, query: any = {}) {
    const { customerId, leadId, dealId, type, page = 1, pageSize = 30 } = query;
    const where: any = { organizationId: orgId };
    if (customerId) where.customerId = customerId;
    if (leadId) where.leadId = leadId;
    if (dealId) where.dealId = dealId;
    if (type) where.type = type;
    return this.prisma.activity.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), include: { user: { select: { id: true, firstName: true, lastName: true } }, customer: { select: { id: true, name: true } } } });
  }
  async create(orgId: string, userId: string, dto: any) {
    return this.prisma.activity.create({ data: { ...dto, organizationId: orgId, userId } });
  }
}
