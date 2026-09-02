import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadStage, DealStage, OrderStatus } from '@prisma/client';

@Injectable()
export class CRMAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getExecutiveSummary(orgId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      openLeadsCount,
      qualifiedLeadsCount,
      totalLeadsCount,
      openDeals,
      wonDealsThisMonth,
      activeOrders,
      customerCount,
      recentActivitiesCount,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: {
          organizationId: orgId,
          stage: { in: [LeadStage.NEW, LeadStage.CONTACTED] },
          isArchived: false,
        },
      }),
      this.prisma.lead.count({
        where: { organizationId: orgId, stage: LeadStage.QUALIFIED, isArchived: false },
      }),
      this.prisma.lead.count({ where: { organizationId: orgId, isArchived: false } }),
      this.prisma.deal.findMany({
        where: {
          organizationId: orgId,
          stage: { notIn: [DealStage.WON, DealStage.LOST] },
        },
        select: { value: true, weightedRevenue: true },
      }),
      this.prisma.deal.findMany({
        where: {
          organizationId: orgId,
          stage: DealStage.WON,
          wonAt: { gte: startOfMonth },
        },
        select: { value: true },
      }),
      this.prisma.order.findMany({
        where: {
          organizationId: orgId,
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED] },
        },
        select: { total: true },
      }),
      this.prisma.customer.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      this.prisma.activity.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
    ]);

    const openPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const weightedPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.weightedRevenue || 0), 0);
    const wonRevenueThisMonth = wonDealsThisMonth.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const activeOrderRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    const leadConversionRate = totalLeadsCount > 0 ? Math.round((qualifiedLeadsCount / totalLeadsCount) * 100) : 0;

    return {
      openLeads: openLeadsCount,
      qualifiedLeads: qualifiedLeadsCount,
      totalLeads: totalLeadsCount,
      leadConversionRate,
      openDealsCount: openDeals.length,
      openPipelineValue,
      weightedPipelineValue,
      wonRevenueThisMonth,
      activeOrdersCount: activeOrders.length,
      activeOrderRevenue,
      customerCount,
      activeActivitiesThisWeek: recentActivitiesCount,
    };
  }

  async getForecast(orgId: string, pipelineId?: string) {
    const where: any = {
      organizationId: orgId,
      stage: { notIn: [DealStage.WON, DealStage.LOST] },
    };
    if (pipelineId) where.pipelineId = pipelineId;

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        pipelineStage: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const now = new Date();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const quarterEnd = new Date(now.getFullYear(), now.getMonth() + 4, 0);

    let currentMonthForecast = 0;
    let nextMonthForecast = 0;
    let quarterForecast = 0;
    let futureForecast = 0;

    deals.forEach((deal) => {
      const weighted = Number(deal.weightedRevenue || 0);
      const closeDate = deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null;

      if (!closeDate || closeDate <= currentMonthEnd) {
        currentMonthForecast += weighted;
      } else if (closeDate <= nextMonthEnd) {
        nextMonthForecast += weighted;
      } else if (closeDate <= quarterEnd) {
        quarterForecast += weighted;
      } else {
        futureForecast += weighted;
      }
    });

    // Salesperson performance aggregation
    const ownerMap: Record<string, { name: string; openValue: number; weightedValue: number; dealCount: number }> = {};
    deals.forEach((deal) => {
      const ownerName = deal.owner ? `${deal.owner.firstName} ${deal.owner.lastName}` : 'Unassigned';
      if (!ownerMap[ownerName]) {
        ownerMap[ownerName] = { name: ownerName, openValue: 0, weightedValue: 0, dealCount: 0 };
      }
      ownerMap[ownerName].openValue += Number(deal.value || 0);
      ownerMap[ownerName].weightedValue += Number(deal.weightedRevenue || 0);
      ownerMap[ownerName].dealCount += 1;
    });

    // Lead source conversion aggregation
    const sources = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId: orgId },
      _count: { id: true },
    });

    return {
      periods: {
        currentMonth: { label: 'This Month', weightedRevenue: currentMonthForecast },
        nextMonth: { label: 'Next Month', weightedRevenue: nextMonthForecast },
        thisQuarter: { label: 'This Quarter', weightedRevenue: quarterForecast },
        pipelineTotal: { label: 'Full Pipeline', weightedRevenue: currentMonthForecast + nextMonthForecast + quarterForecast + futureForecast },
      },
      salespersonLeaderboard: Object.values(ownerMap),
      sourceBreakdown: sources.map((s) => ({ source: s.source || 'Direct', count: s._count.id })),
    };
  }
}
