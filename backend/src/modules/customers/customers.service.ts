import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto/customers.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: CustomerQueryDto) {
    const { search, status, page = 1, pageSize = 50, sortBy = 'createdAt', sortDir = 'desc' } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { organizationId: orgId };
    if (status && status !== ('all' as any)) where.status = status;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { [sortBy]: sortDir },
        include: {
          companyRel: { select: { id: true, displayName: true } },
          contact: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { deals: true, orders: true, quotations: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / pageSize) };
  }

  async findOne(orgId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        companyRel: true,
        contact: true,
        deals: { orderBy: { createdAt: 'desc' }, take: 10 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 10 },
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        tasks: { where: { status: { not: 'CANCELLED' } }, orderBy: { dueDate: 'asc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  /**
   * Consolidated Customer 360° View Aggregation Engine.
   */
  async getCustomer360(orgId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        companyRel: {
          include: {
            contacts: true,
          },
        },
        contact: true,
        deals: {
          orderBy: { createdAt: 'desc' },
          include: { pipelineStage: true },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        tasks: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    // Aggregate key 360 metrics
    const openDeals = customer.deals.filter((d) => d.stage !== 'WON' && d.stage !== 'LOST');
    const wonDeals = customer.deals.filter((d) => d.stage === 'WON');
    const openPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const wonPipelineValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

    const activeOrders = customer.orders.filter((o) => o.status !== 'CANCELLED');
    const totalOrderValue = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    const paidInvoices = customer.invoices.filter((i) => i.status === 'PAID');
    const totalInvoiced = customer.invoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
    const totalPaid = customer.invoices.reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);
    const outstandingBalance = Math.max(totalInvoiced - totalPaid, 0);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        company: customer.company,
        email: customer.email,
        phone: customer.phone,
        website: customer.website,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        zipCode: customer.zipCode,
        status: customer.status,
        tags: customer.tags,
        notes: customer.notes,
        totalRevenue: customer.totalRevenue,
        lastPurchaseAt: customer.lastPurchaseAt,
        createdAt: customer.createdAt,
      },
      company: customer.companyRel,
      primaryContact: customer.contact,
      metrics: {
        lifetimeValue: Number(customer.totalRevenue || totalPaid || totalOrderValue),
        openDealsCount: openDeals.length,
        openPipelineValue,
        wonDealsCount: wonDeals.length,
        wonPipelineValue,
        ordersCount: customer.orders.length,
        totalOrderValue,
        quotationsCount: customer.quotations.length,
        invoicesCount: customer.invoices.length,
        totalInvoiced,
        totalPaid,
        outstandingBalance,
        activitiesCount: customer.activities.length,
      },
      deals: customer.deals,
      quotations: customer.quotations,
      orders: customer.orders,
      invoices: customer.invoices,
      activities: customer.activities,
      tasks: customer.tasks,
    };
  }

  async create(orgId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async update(orgId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(orgId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted' };
  }

  async getStats(orgId: string) {
    const [total, active, inactive, newThisMonth] = await Promise.all([
      this.prisma.customer.count({ where: { organizationId: orgId } }),
      this.prisma.customer.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      this.prisma.customer.count({ where: { organizationId: orgId, status: { in: ['INACTIVE', 'CHURNED'] } } }),
      this.prisma.customer.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: new Date(new Date().setDate(1)) },
        },
      }),
    ]);
    return { total, active, inactive, newThisMonth };
  }
}
