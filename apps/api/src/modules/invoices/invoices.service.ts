import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async nextInvoiceNumber(orgId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { organizationId: orgId } });
    return `INV-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(orgId: string, query: any = {}) {
    const { status, customerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status && status !== 'all') where.status = status;
    if (customerId) where.customerId = customerId;
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, company: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getStats(orgId: string) {
    const now = new Date();
    const [total, paid, overdue, draft, pending] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { organizationId: orgId }, _sum: { total: true } }),
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'PAID' }, _sum: { total: true } }),
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'OVERDUE' }, _sum: { total: true }, _count: true }),
      this.prisma.invoice.count({ where: { organizationId: orgId, status: 'DRAFT' } }),
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: { in: ['SENT', 'PARTIALLY_PAID'] } }, _sum: { total: true }, _count: true }),
    ]);
    return {
      totalRevenue: total._sum.total ?? 0,
      collected: paid._sum.total ?? 0,
      overdueAmount: overdue._sum.total ?? 0,
      overdueCount: overdue._count ?? 0,
      draftCount: draft,
      pendingAmount: pending._sum.total ?? 0,
      pendingCount: pending._count ?? 0,
    };
  }

  async findOne(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(orgId: string, dto: any) {
    const invoiceNumber = await this.nextInvoiceNumber(orgId);
    const items: any[] = dto.items ?? [];
    const subtotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice * (item.taxRate ?? 0) / 100, 0);
    const discount = dto.discount ?? 0;
    const total = subtotal + taxAmount - discount;

    return this.prisma.invoice.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId,
        invoiceNumber,
        status: dto.status ?? 'DRAFT',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        termsAndConditions: dto.termsAndConditions,
        currency: dto.currency ?? 'INR',
        subtotal,
        taxAmount,
        discount,
        total,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? 0,
            discount: item.discount ?? 0,
            total: item.quantity * item.unitPrice * (1 + (item.taxRate ?? 0) / 100) - (item.discount ?? 0),
          })),
        },
      },
      include: { customer: true, items: true },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    const invoice = await this.findOne(orgId, id);
    if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Cannot edit a paid invoice');

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.customerId) updateData.customerId = dto.customerId;

    // Update items if provided
    if (dto.items) {
      await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      const items = dto.items;
      updateData.subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
      updateData.taxAmount = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice * (i.taxRate ?? 0) / 100, 0);
      updateData.discount = dto.discount ?? invoice.discount;
      updateData.total = updateData.subtotal + updateData.taxAmount - Number(updateData.discount);
      await this.prisma.invoiceItem.createMany({
        data: items.map((i: any) => ({
          invoiceId: id,
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate ?? 0,
          discount: i.discount ?? 0,
          total: i.quantity * i.unitPrice,
        })),
      });
    }

    return this.prisma.invoice.update({ where: { id }, data: updateData, include: { items: true, customer: true } });
  }

  async markSent(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.invoice.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } });
  }

  async markPaid(orgId: string, id: string, amount?: number) {
    const invoice = await this.findOne(orgId, id);
    const total = Number(invoice.total);
    const paid = Number(invoice.amountPaid) + (amount ?? total);
    const status = paid >= total ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    return this.prisma.invoice.update({
      where: { id },
      data: { status, amountPaid: paid, paidAt: status === 'PAID' ? new Date() : undefined },
    });
  }

  async remove(orgId: string, id: string) {
    const invoice = await this.findOne(orgId, id);
    if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Cannot delete a paid invoice');
    await this.prisma.invoice.delete({ where: { id } });
    return { message: 'Invoice deleted' };
  }
}
