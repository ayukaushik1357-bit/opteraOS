import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async nextOrderNumber(orgId: string): Promise<string> {
    const count = await this.prisma.order.count({ where: { organizationId: orgId } });
    return `ORD-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(orgId: string, query: any = {}) {
    const { status, customerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, name: true, company: true } }, items: true } }),
      this.prisma.order.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async findOne(orgId: string, id: string) {
    return this.prisma.order.findFirst({ where: { id, organizationId: orgId }, include: { customer: true, items: { include: { product: true } }, invoice: true } });
  }

  async create(orgId: string, dto: any) {
    const orderNumber = await this.nextOrderNumber(orgId);
    const items: any[] = dto.items ?? [];
    const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
    const taxAmount = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice * (i.taxRate ?? 0) / 100, 0);
    const discount = dto.discount ?? 0;
    const total = subtotal + taxAmount - discount;
    return this.prisma.order.create({
      data: {
        organizationId: orgId, customerId: dto.customerId, orderNumber,
        status: dto.status ?? 'DRAFT', subtotal, taxAmount, discount, total,
        currency: dto.currency ?? 'INR', notes: dto.notes,
        items: { create: items.map((i: any) => ({ productId: i.productId, name: i.name, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate ?? 0, discount: i.discount ?? 0, total: i.quantity * i.unitPrice })) },
      },
      include: { items: true, customer: true },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    return this.prisma.order.update({ where: { id }, data: dto });
  }

  async remove(orgId: string, id: string) {
    await this.prisma.order.delete({ where: { id } });
    return { message: 'Order deleted' };
  }
}
