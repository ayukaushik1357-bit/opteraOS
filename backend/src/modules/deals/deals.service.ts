import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDealDto, UpdateDealDto } from './dto/deals.dto';
import { NotificationsService } from '../notifications/notifications.service';

const memoryDeals = new Map<string, any[]>();

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, stage, customerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    try {
      const where: any = { organizationId: orgId };
      if (stage) where.stage = stage;
      if (customerId) where.customerId = customerId;
      if (search) where.title = { contains: search, mode: 'insensitive' };
      const [rows, total] = await Promise.all([
        this.prisma.deal.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, company: true } },
            owner: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        this.prisma.deal.count({ where }),
      ]);
      return { rows, total, page: Number(page), pageSize: take, pages: Math.ceil(total / take) || 1 };
    } catch {
      let list = memoryDeals.get(orgId) || [];
      if (stage) list = list.filter((d) => d.stage === stage);
      if (customerId) list = list.filter((d) => d.customerId === customerId);
      if (search) {
        const s = search.toLowerCase();
        list = list.filter((d) => d.title && d.title.toLowerCase().includes(s));
      }
      const total = list.length;
      const rows = list.slice(skip, skip + take);
      return { rows, total, page: Number(page), pageSize: take, pages: Math.ceil(total / take) || 1 };
    }
  }

  async getPipeline(orgId: string) {
    let deals: any[] = [];
    try {
      deals = await this.prisma.deal.findMany({
        where: { organizationId: orgId },
        include: { customer: { select: { id: true, name: true, company: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      deals = memoryDeals.get(orgId) || [];
    }
    const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    return stages.reduce((acc, stage) => {
      acc[stage] = deals.filter((d) => d.stage === stage);
      return acc;
    }, {} as Record<string, typeof deals>);
  }

  async getStats(orgId: string) {
    try {
      const [total, won, lost, pipeline] = await Promise.all([
        this.prisma.deal.count({ where: { organizationId: orgId } }),
        this.prisma.deal.count({ where: { organizationId: orgId, stage: 'WON' } }),
        this.prisma.deal.count({ where: { organizationId: orgId, stage: 'LOST' } }),
        this.prisma.deal.aggregate({ where: { organizationId: orgId, stage: { notIn: ['WON', 'LOST'] } }, _sum: { value: true } }),
      ]);
      const winRate = total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0;
      return { total, won, lost, winRate, pipelineValue: pipeline._sum.value ?? 0 };
    } catch {
      const deals = memoryDeals.get(orgId) || [];
      const total = deals.length;
      const won = deals.filter((d) => d.stage === 'WON').length;
      const lost = deals.filter((d) => d.stage === 'LOST').length;
      const pipelineValue = deals
        .filter((d) => d.stage !== 'WON' && d.stage !== 'LOST')
        .reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const winRate = total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0;
      return { total, won, lost, winRate, pipelineValue };
    }
  }

  async findOne(orgId: string, id: string) {
    try {
      const deal = await this.prisma.deal.findFirst({
        where: { id, organizationId: orgId },
        include: {
          customer: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          activities: { orderBy: { createdAt: 'desc' }, take: 20 },
          tasks: { where: { status: { not: 'CANCELLED' } }, orderBy: { dueDate: 'asc' } },
        },
      });
      if (deal) return deal;
    } catch {}

    const deals = memoryDeals.get(orgId) || [];
    const found = deals.find((d) => d.id === id);
    if (found) return found;

    throw new NotFoundException('Deal not found');
  }

  async create(orgId: string, userId: string, dto: CreateDealDto) {
    const fallbackDeal = {
      id: crypto.randomUUID(),
      organizationId: orgId,
      createdById: userId,
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let deal: any = fallbackDeal;
    try {
      deal = await this.prisma.deal.create({ data: { ...dto, organizationId: orgId, createdById: userId } });
    } catch {
      const list = memoryDeals.get(orgId) || [];
      memoryDeals.set(orgId, [fallbackDeal, ...list]);
    }

    if (dto.ownerId && dto.ownerId !== userId) {
      this.notifications.create(
        orgId,
        dto.ownerId,
        'DEAL_UPDATE',
        'New Deal Assigned',
        `You have been assigned deal: "${deal.title}"`,
        `/deals?id=${deal.id}`,
      ).catch(() => {});
    }

    return deal;
  }

  async update(orgId: string, id: string, dto: UpdateDealDto) {
    try {
      const existing = await this.findOne(orgId, id);
      const updated = await this.prisma.deal.update({ where: { id }, data: dto });

      if (dto.ownerId && dto.ownerId !== existing.ownerId) {
        this.notifications.create(
          orgId,
          dto.ownerId,
          'DEAL_UPDATE',
          'Deal Reassigned to You',
          `You have been assigned deal: "${updated.title}"`,
          `/deals?id=${updated.id}`,
        ).catch(() => {});
      }

      return updated;
    } catch {
      const list = memoryDeals.get(orgId) || [];
      const idx = list.findIndex((d) => d.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...dto, updatedAt: new Date() };
        return list[idx];
      }
      return { id, ...dto };
    }
  }

  async remove(orgId: string, id: string) {
    try {
      await this.findOne(orgId, id);
      await this.prisma.deal.delete({ where: { id } });
    } catch {
      const list = memoryDeals.get(orgId) || [];
      memoryDeals.set(orgId, list.filter((d) => d.id !== id));
    }
    return { message: 'Deal deleted' };
  }
}
