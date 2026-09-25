import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { QuotationStatus } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  private async nextQuotationNumber(orgId: string): Promise<string> {
    const count = await this.prisma.quotation.count({ where: { organizationId: orgId } });
    return `QT-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(orgId: string, query: any = {}) {
    const { status, customerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (status && status !== 'ALL') where.status = status as QuotationStatus;
    if (customerId) where.customerId = customerId;

    const [rows, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, company: true, email: true } }, items: true },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async findOne(orgId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async create(orgId: string, dto: any) {
    const quotationNumber = await this.nextQuotationNumber(orgId);
    const items: any[] = dto.items ?? [];

    // Server-side financial calculations
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0), 0);
    const taxAmount = items.reduce((sum: number, item: any) => {
      const lineSub = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      return sum + (lineSub * (Number(item.taxRate) || 0)) / 100;
    }, 0);
    const discount = Number(dto.discountAmount || dto.discount) || 0;
    const total = subtotal + taxAmount - discount;

    return this.prisma.quotation.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId,
        quotationNumber,
        status: QuotationStatus.DRAFT,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : new Date(Date.now() + 30 * 86400000),
        subtotal,
        taxAmount,
        discount,
        total,
        notes: dto.notes,
        terms: dto.terms,
        currency: dto.currency ?? 'INR',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            name: item.description || item.name || 'Custom Item',
            description: item.description || null,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            taxRate: Number(item.taxRate) || 0,
            discount: Number(item.discountPercent) || 0,
            total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0) * (1 + (Number(item.taxRate) || 0) / 100),
          })),
        },
      },
      include: { customer: true, items: true },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    const quote = await this.findOne(orgId, id);
    if (quote.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot edit an accepted quotation');
    }

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.terms !== undefined) updateData.terms = dto.terms;

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: true },
    });
  }

  async accept(orgId: string, id: string, data: any = {}) {
    const quote = await this.findOne(orgId, id);
    return this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.ACCEPTED, notes: data.notes || quote.notes },
      include: { customer: true, items: true },
    });
  }

  async reject(orgId: string, id: string, reason?: string) {
    const quote = await this.findOne(orgId, id);
    return this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.REJECTED, notes: reason ? `Rejected: ${reason}` : quote.notes },
    });
  }

  async cancel(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.CANCELLED },
    });
  }

  async approve(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.SENT },
    });
  }

  async convertToSalesOrder(orgId: string, id: string) {
    const quote = await this.findOne(orgId, id);
    const order = await this.ordersService.create(orgId, {
      customerId: quote.customerId,
      items: quote.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
      })),
      notes: `Converted from Quotation ${quote.quotationNumber}`,
    });

    await this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.ACCEPTED },
    });

    return { success: true, order, message: `Quotation converted to Sales Order ${order.orderNumber}` };
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.quotation.delete({ where: { id } });
    return { success: true, message: 'Quotation deleted successfully' };
  }
}
