import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto/customers.dto';

const memoryCustomers = new Map<string, any[]>();

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: CustomerQueryDto) {
    const { search, status, page = 1, pageSize = 50, sortBy = 'createdAt', sortDir = 'desc' } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    try {
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
          take,
          orderBy: { [sortBy]: sortDir },
          select: {
            id: true, name: true, company: true, email: true, phone: true,
            status: true, totalRevenue: true, lastPurchaseAt: true, createdAt: true,
            tags: true, assignedTo: true,
          },
        }),
        this.prisma.customer.count({ where }),
      ]);

      return { rows, total, page: Number(page), pageSize: take, pages: Math.ceil(total / take) || 1 };
    } catch {
      let list = memoryCustomers.get(orgId) || [];
      if (status && status !== ('all' as any)) list = list.filter((c) => c.status === status);
      if (search?.trim()) {
        const s = search.toLowerCase();
        list = list.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(s)) ||
            (c.company && c.company.toLowerCase().includes(s)) ||
            (c.email && c.email.toLowerCase().includes(s)),
        );
      }
      const total = list.length;
      const rows = list.slice(skip, skip + take);
      return { rows, total, page: Number(page), pageSize: take, pages: Math.ceil(total / take) || 1 };
    }
  }

  async findOne(orgId: string, id: string) {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: { id, organizationId: orgId },
        include: {
          deals: { orderBy: { createdAt: 'desc' }, take: 10 },
          invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
          activities: { orderBy: { createdAt: 'desc' }, take: 20 },
          tasks: { where: { status: { not: 'CANCELLED' } }, orderBy: { dueDate: 'asc' }, take: 10 },
        },
      });
      if (customer) return customer;
    } catch {}

    const list = memoryCustomers.get(orgId) || [];
    const found = list.find((c) => c.id === id);
    if (found) return found;

    throw new NotFoundException('Customer not found');
  }

  async create(orgId: string, dto: CreateCustomerDto) {
    const fallbackCustomer = {
      id: crypto.randomUUID(),
      organizationId: orgId,
      ...dto,
      status: dto.status || 'ACTIVE',
      totalRevenue: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      return await this.prisma.customer.create({
        data: { ...dto, organizationId: orgId },
      });
    } catch {
      const list = memoryCustomers.get(orgId) || [];
      memoryCustomers.set(orgId, [fallbackCustomer, ...list]);
      return fallbackCustomer;
    }
  }

  async update(orgId: string, id: string, dto: UpdateCustomerDto) {
    try {
      await this.findOne(orgId, id);
      return await this.prisma.customer.update({ where: { id }, data: dto });
    } catch {
      const list = memoryCustomers.get(orgId) || [];
      const idx = list.findIndex((c) => c.id === id);
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
      await this.prisma.customer.delete({ where: { id } });
    } catch {
      const list = memoryCustomers.get(orgId) || [];
      memoryCustomers.set(orgId, list.filter((c) => c.id !== id));
    }
    return { message: 'Customer deleted' };
  }

  async getStats(orgId: string) {
    try {
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
    } catch {
      const list = memoryCustomers.get(orgId) || [];
      const total = list.length;
      const active = list.filter((c) => c.status === 'ACTIVE').length;
      const inactive = list.filter((c) => c.status === 'INACTIVE' || c.status === 'CHURNED').length;
      return { total, active, inactive, newThisMonth: total };
    }
  }
}
