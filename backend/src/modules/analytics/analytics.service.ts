import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(period: string) {
    const now = new Date();
    const ranges: Record<string, Date> = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      '7d': new Date(now.getTime() - 7 * 86400000),
      '30d': new Date(now.getTime() - 30 * 86400000),
      '90d': new Date(now.getTime() - 90 * 86400000),
      '12m': new Date(now.getTime() - 365 * 86400000),
    };
    return ranges[period] ?? ranges['30d'];
  }

  async getDashboard(orgId: string, period = '30d') {
    const since = this.getDateRange(period);
    const prevSince = new Date(since.getTime() - (Date.now() - since.getTime()));

    const [
      revenueData, prevRevenueData,
      customerCount, newCustomers, prevNewCustomers,
      orderCount,
      invoiceStats,
      taskStats,
      dealStats,
      leadCount,
      recentActivities,
      lowStockCount,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'PAID', paidAt: { gte: since } }, _sum: { total: true } }),
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'PAID', paidAt: { gte: prevSince, lt: since } }, _sum: { total: true } }),
      this.prisma.customer.count({ where: { organizationId: orgId } }),
      this.prisma.customer.count({ where: { organizationId: orgId, createdAt: { gte: since } } }),
      this.prisma.customer.count({ where: { organizationId: orgId, createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.order.count({ where: { organizationId: orgId, createdAt: { gte: since } } }),
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] } }, _sum: { total: true }, _count: true }),
      this.prisma.task.aggregate({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, _count: true }),
      this.prisma.deal.aggregate({ where: { organizationId: orgId, stage: { notIn: ['WON', 'LOST'] } }, _sum: { value: true }, _count: true }),
      this.prisma.lead.count({ where: { organizationId: orgId, createdAt: { gte: since } } }),
      this.prisma.activity.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 10, include: { customer: { select: { name: true } }, user: { select: { firstName: true, lastName: true } } } }),
      this.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) FROM products WHERE "organizationId" = ${orgId} AND stock <= "minStock"`,
    ]);

    const revenue = Number(revenueData._sum.total ?? 0);
    const prevRevenue = Number(prevRevenueData._sum.total ?? 0);
    const revenueChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;
    const customerChange = prevNewCustomers > 0 ? Math.round(((newCustomers - prevNewCustomers) / prevNewCustomers) * 100) : 0;

    return {
      period,
      revenue: { value: revenue, change: revenueChange, currency: 'INR' },
      customers: { total: customerCount, new: newCustomers, change: customerChange },
      orders: { count: orderCount },
      invoices: { pending: invoiceStats._count, pendingAmount: Number(invoiceStats._sum.total ?? 0) },
      tasks: { open: taskStats._count ?? 0 },
      deals: { open: dealStats._count ?? 0, pipelineValue: Number(dealStats._sum.value ?? 0) },
      leads: { newCount: leadCount },
      lowStockProducts: Number((lowStockCount as any[])[0]?.count ?? 0),
      recentActivities,
    };
  }

  async getRevenueTrend(orgId: string, months = 6) {
    const results = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const [revenue, orders] = await Promise.all([
        this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'PAID', paidAt: { gte: start, lte: end } }, _sum: { total: true } }),
        this.prisma.order.count({ where: { organizationId: orgId, createdAt: { gte: start, lte: end } } }),
      ]);
      results.push({
        month: start.toLocaleString('default', { month: 'short' }),
        year: start.getFullYear(),
        revenue: Number(revenue._sum.total ?? 0),
        orders,
      });
    }
    return results;
  }

  async getCustomerGrowth(orgId: string, months = 6) {
    const results = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const [newCustomers, totalCustomers] = await Promise.all([
        this.prisma.customer.count({ where: { organizationId: orgId, createdAt: { gte: start, lte: end } } }),
        this.prisma.customer.count({ where: { organizationId: orgId, createdAt: { lte: end } } }),
      ]);
      results.push({ month: start.toLocaleString('default', { month: 'short' }), newCustomers, totalCustomers });
    }
    return results;
  }

  async getSalesPipeline(orgId: string) {
    const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const result = await Promise.all(
      stages.map(async (stage) => {
        const agg = await this.prisma.deal.aggregate({ where: { organizationId: orgId, stage: stage as any }, _sum: { value: true }, _count: true });
        return { stage, count: agg._count, value: Number(agg._sum.value ?? 0) };
      }),
    );
    return result;
  }

  async getTopProducts(orgId: string, limit = 10) {
    return this.prisma.$queryRaw`
      SELECT p.id, p.name, p.sku,
             SUM(ii.quantity) as units_sold,
             SUM(ii.total) as revenue
      FROM invoice_items ii
      JOIN products p ON p.id = ii."productId"
      JOIN invoices i ON i.id = ii."invoiceId"
      WHERE i."organizationId" = ${orgId}
        AND i.status = 'PAID'
      GROUP BY p.id, p.name, p.sku
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;
  }

  async getAIInsights(orgId: string) {
    const [overdueInvoices, inactiveCustomers, lowStock, overdueTaskCount] = await Promise.all([
      this.prisma.invoice.count({ where: { organizationId: orgId, status: 'OVERDUE' } }),
      this.prisma.customer.count({ where: { organizationId: orgId, lastPurchaseAt: { lt: new Date(Date.now() - 60 * 86400000) } } }),
      this.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) FROM products WHERE "organizationId" = ${orgId} AND stock <= "minStock"`,
      this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: new Date() } } }),
    ]);
    const insights = [];
    if (overdueInvoices > 0) insights.push({ type: 'warning', message: `${overdueInvoices} invoice${overdueInvoices > 1 ? 's are' : ' is'} overdue`, action: 'Review Invoices', route: '/invoices?status=OVERDUE' });
    if (inactiveCustomers > 0) insights.push({ type: 'info', message: `${inactiveCustomers} high-value customer${inactiveCustomers > 1 ? 's have' : ' has'} been inactive for 60+ days`, action: 'Create Campaign', route: '/marketing' });
    if (Number((lowStock as any[])[0]?.count ?? 0) > 0) insights.push({ type: 'warning', message: `${(lowStock as any[])[0].count} product${Number((lowStock as any[])[0].count) > 1 ? 's are' : ' is'} running low on stock`, action: 'Review Inventory', route: '/inventory' });
    if (overdueTaskCount > 0) insights.push({ type: 'urgent', message: `${overdueTaskCount} task${overdueTaskCount > 1 ? 's are' : ' is'} overdue`, action: 'View Tasks', route: '/tasks' });
    return insights;
  }
}
