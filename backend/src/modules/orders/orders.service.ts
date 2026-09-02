import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequencesService } from '../sequences/sequences.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateOrderDto, UpdateOrderDto, CancelOrderDto } from './dto/orders.dto';
import { OrderStatus, SequenceType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private sequences: SequencesService,
    private events: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: any = {}) {
    const { status, customerId, companyId, quotationId, salespersonId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (companyId) where.companyId = companyId;
    if (quotationId) where.quotationId = quotationId;
    if (salespersonId) where.salespersonId = salespersonId;

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, company: true, email: true } },
          company: { select: { id: true, displayName: true } },
          salesperson: { select: { id: true, firstName: true, lastName: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          invoice: { select: { id: true, invoiceNumber: true, status: true } },
          _count: { select: { items: true, pickings: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async findOne(orgId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        company: true,
        contact: true,
        quotation: true,
        salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
        salesTeam: true,
        pricelist: true,
        items: {
          orderBy: { sequence: 'asc' },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
        },
        invoice: true,
        pickings: true,
      },
    });
    if (!order) throw new NotFoundException('Sales Order not found');
    return order;
  }

  calculateTotals(items: any[], globalDiscountAmount = 0) {
    let subtotal = 0;
    let taxAmount = 0;

    const calculatedItems = items.map((item, index) => {
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const discPercent = Number(item.discountPercent || 0);
      const taxRate = Number(item.taxRate || 0);

      const lineBase = qty * unitPrice;
      const lineDiscount = (lineBase * discPercent) / 100;
      const lineSubtotal = lineBase - lineDiscount;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        ...item,
        quantity: qty,
        unitPrice,
        discountPercent: discPercent,
        taxRate,
        discount: lineDiscount,
        subtotal: lineSubtotal,
        total: lineTotal,
        sequence: item.sequence ?? index,
      };
    });

    const finalSubtotal = subtotal;
    const finalDiscount = Number(globalDiscountAmount || 0);
    const finalTotal = Math.max(finalSubtotal + taxAmount - finalDiscount, 0);

    return {
      items: calculatedItems,
      subtotal: finalSubtotal,
      taxAmount,
      discountAmount: finalDiscount,
      total: finalTotal,
    };
  }

  async create(orgId: string, userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Sales order must contain at least one line item.');
    }

    const { items, subtotal, taxAmount, discountAmount, total } = this.calculateTotals(
      dto.items,
      dto.discountAmount || 0,
    );

    const orderNumber = await this.sequences.getNextSequence(orgId, SequenceType.SALES_ORDER, 'SO');

    return this.prisma.order.create({
      data: {
        organizationId: orgId,
        orderNumber,
        customerId: dto.customerId,
        companyId: dto.companyId,
        contactId: dto.contactId,
        quotationId: dto.quotationId,
        salespersonId: dto.salespersonId || userId,
        salesTeamId: dto.salesTeamId,
        pricelistId: dto.pricelistId,
        status: dto.status || OrderStatus.DRAFT,
        currency: dto.currency || 'INR',
        paymentTerms: dto.paymentTerms || 'Net 30',
        subtotal,
        taxAmount,
        discount: discountAmount,
        discountAmount,
        total,
        notes: dto.notes,
        shippingAddress: dto.shippingAddress || {},
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            productVariantId: i.productVariantId,
            name: i.name,
            sku: i.sku,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            taxRate: i.taxRate,
            discount: i.discount,
            subtotal: i.subtotal,
            total: i.total,
            sequence: i.sequence,
          })),
        },
      },
      include: { items: true, customer: true },
    });
  }

  async update(orgId: string, id: string, dto: UpdateOrderDto) {
    const existing = await this.prisma.order.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Sales Order not found');

    if (existing.status === OrderStatus.DELIVERED || existing.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update order in ${existing.status} state.`);
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        contactId: dto.contactId,
        salespersonId: dto.salespersonId,
        paymentTerms: dto.paymentTerms,
        discountAmount: dto.discountAmount,
        notes: dto.notes,
        shippingAddress: dto.shippingAddress,
      },
      include: { items: true, customer: true },
    });
  }

  /**
   * Order Confirmation Transaction:
   * Transitions status to CONFIRMED, emits sales.order.confirmed event (Fulfillment Contract),
   * and logs universal activity & audit trail.
   */
  async confirmOrder(orgId: string, id: string, userId?: string) {
    const order = await this.findOne(orgId, id);

    // Idempotency check
    if (order.status === OrderStatus.CONFIRMED) {
      return {
        message: 'Order already confirmed',
        order,
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot confirm a cancelled order.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: userId,
        },
        include: { items: true, customer: true },
      });

      // Record Activity
      await tx.activity.create({
        data: {
          organizationId: orgId,
          type: 'STATUS_CHANGE',
          title: `Sales Order ${confirmed.orderNumber} Confirmed`,
          description: `Order confirmed for customer ${confirmed.customer?.name || 'Customer'}. Total: ${confirmed.currency} ${Number(confirmed.total).toFixed(2)}.`,
          entityType: 'ORDER',
          entityId: id,
          customerId: confirmed.customerId,
          createdById: userId,
        },
      });

      return confirmed;
    });

    // Publish Fulfillment Contract domain event
    await this.events.publish('sales.order.confirmed', {
      orgId,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerId: updated.customerId,
      contactId: updated.contactId,
      currency: updated.currency,
      total: Number(updated.total),
      lines: updated.items.map((i) => ({
        productId: i.productId,
        productVariantId: i.productVariantId,
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
      })),
      shippingAddress: updated.shippingAddress,
      confirmedAt: updated.confirmedAt,
      confirmedById: userId,
    });

    return {
      message: 'Order confirmed successfully',
      order: updated,
    };
  }

  /**
   * Order Cancellation Workflow
   */
  async cancelOrder(orgId: string, id: string, dto: CancelOrderDto, userId?: string) {
    const order = await this.findOne(orgId, id);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel an order that has already been delivered.');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.reason,
      },
    });

    await this.events.publish('sales.order.cancelled', {
      orgId,
      orderId: id,
      orderNumber: order.orderNumber,
      reason: dto.reason,
      cancelledBy: userId,
    });

    return updated;
  }

  /**
   * Invoicing Contract: Exposes sales order context ready for finance module.
   */
  async getInvoiceContext(orgId: string, id: string) {
    const order = await this.findOne(orgId, id);
    return {
      readyForInvoice: order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.DELIVERED,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customer?.name,
      currency: order.currency,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      total: order.total,
      lines: order.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
        taxRate: i.taxRate,
        total: i.total,
      })),
    };
  }

  async remove(orgId: string, id: string) {
    const order = await this.findOne(orgId, id);
    if (order.status === OrderStatus.CONFIRMED) {
      throw new BadRequestException('Cannot delete confirmed sales order. Cancel it instead.');
    }

    await this.prisma.order.delete({ where: { id } });
    return { message: 'Order deleted successfully' };
  }
}
