import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequencesService } from '../sequences/sequences.service';
import { CommunicationsService } from '../communications/communications.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import {
  CreateQuotationDto, UpdateQuotationDto, SendQuotationEmailDto, AcceptQuotationDto, RejectQuotationDto,
} from './dto/quotations.dto';
import { generateQuotationPdf } from './quotations.pdf';
import { QuotationStatus, ApprovalStatus, SequenceType, OrderStatus } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private sequences: SequencesService,
    private communications: CommunicationsService,
    private events: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: any = {}) {
    const { status, customerId, opportunityId, salespersonId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (opportunityId) where.opportunityId = opportunityId;
    if (salespersonId) where.salespersonId = salespersonId;

    const [rows, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, company: true, email: true } },
          company: { select: { id: true, displayName: true } },
          opportunity: { select: { id: true, title: true } },
          salesperson: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, orderNumber: true, status: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.quotation.count({ where }),
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
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        company: true,
        contact: true,
        opportunity: true,
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
        order: true,
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  /**
   * Calculates subtotals, taxes, discounts and totals for quotation items.
   */
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

  async create(orgId: string, userId: string, dto: CreateQuotationDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A quotation must contain at least one line item.');
    }

    const { items, subtotal, taxAmount, discountAmount, total } = this.calculateTotals(
      dto.items,
      dto.discountAmount || 0,
    );

    // Concurrency-safe sequence numbering
    const quotationNumber = await this.sequences.getNextSequence(orgId, SequenceType.QUOTATION, 'QT');

    // Check discount threshold (Salesperson max 10% discount without approval)
    const discountRatio = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    const approvalStatus = discountRatio > 10 ? ApprovalStatus.PENDING : ApprovalStatus.NONE;

    const quotation = await this.prisma.quotation.create({
      data: {
        organizationId: orgId,
        quotationNumber,
        opportunityId: dto.opportunityId,
        customerId: dto.customerId,
        companyId: dto.companyId,
        contactId: dto.contactId,
        salespersonId: dto.salespersonId || userId,
        salesTeamId: dto.salesTeamId,
        pricelistId: dto.pricelistId,
        currency: dto.currency || 'INR',
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : new Date(Date.now() + 30 * 86400000),
        paymentTerms: dto.paymentTerms || 'Net 30',
        subtotal,
        taxAmount,
        discountAmount,
        total,
        terms: dto.terms,
        notes: dto.notes,
        status: QuotationStatus.DRAFT,
        approvalStatus,
        createdById: userId,
        items: {
          create: items.map((i) => ({
            organizationId: orgId,
            productId: i.productId,
            productVariantId: i.productVariantId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            taxRate: i.taxRate,
            subtotal: i.subtotal,
            total: i.total,
            sequence: i.sequence,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
        salesperson: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.events.publish('quotation.created', {
      orgId,
      userId,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      total: quotation.total,
      customerId: quotation.customerId,
    });

    return quotation;
  }

  async update(orgId: string, id: string, dto: UpdateQuotationDto) {
    const existing = await this.prisma.quotation.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Quotation not found');

    if (existing.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot edit an already accepted quotation.');
    }

    let calculated: any = null;
    if (dto.items && dto.items.length > 0) {
      calculated = this.calculateTotals(dto.items, dto.discountAmount !== undefined ? dto.discountAmount : Number(existing.discountAmount));
    }

    return this.prisma.$transaction(async (tx) => {
      if (calculated) {
        // Replace items
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        await tx.quotationItem.createMany({
          data: calculated.items.map((i: any) => ({
            organizationId: orgId,
            quotationId: id,
            productId: i.productId,
            productVariantId: i.productVariantId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            taxRate: i.taxRate,
            subtotal: i.subtotal,
            total: i.total,
            sequence: i.sequence,
          })),
        });
      }

      return tx.quotation.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          contactId: dto.contactId,
          salespersonId: dto.salespersonId,
          expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
          paymentTerms: dto.paymentTerms,
          discountAmount: dto.discountAmount,
          terms: dto.terms,
          notes: dto.notes,
          subtotal: calculated ? calculated.subtotal : undefined,
          taxAmount: calculated ? calculated.taxAmount : undefined,
          total: calculated ? calculated.total : undefined,
        },
        include: { items: true, customer: true },
      });
    });
  }

  /**
   * Generates vector PDF document buffer for quotation.
   */
  async generatePdf(orgId: string, id: string): Promise<Buffer> {
    const quote = await this.findOne(orgId, id);
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });

    return generateQuotationPdf({
      organization: {
        name: org?.name || 'opteraOS Enterprise',
        legalName: org?.legalName || org?.name,
        email: org?.email,
        phone: org?.phone,
        address: org?.address,
        city: org?.city,
        state: org?.state,
        country: org?.country,
        currency: org?.currency || quote.currency,
      },
      quotationNumber: quote.quotationNumber,
      quotationDate: quote.quotationDate,
      expirationDate: quote.expirationDate,
      paymentTerms: quote.paymentTerms,
      currency: quote.currency,
      customer: quote.customer,
      items: quote.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent),
        taxRate: Number(i.taxRate),
        subtotal: Number(i.subtotal),
        total: Number(i.total),
      })),
      subtotal: Number(quote.subtotal),
      taxAmount: Number(quote.taxAmount),
      discountAmount: Number(quote.discountAmount),
      total: Number(quote.total),
      terms: quote.terms,
      notes: quote.notes,
    });
  }

  /**
   * Dispatches quotation email to customer via CommunicationsModule with PDF attachment.
   * If email fails, returns real error and does not report false success.
   */
  async sendQuotationEmail(orgId: string, id: string, dto: SendQuotationEmailDto, userId: string) {
    const quote = await this.findOne(orgId, id);

    if (quote.approvalStatus === ApprovalStatus.PENDING) {
      throw new BadRequestException('Quotation has excessive discounts pending manager approval.');
    }

    const pdfBuffer = await this.generatePdf(orgId, id);
    const subject = dto.subject || `Quotation ${quote.quotationNumber} from ${quote.salesperson?.firstName || 'Our Team'}`;
    const content = dto.message || `Dear Customer,\n\nPlease find attached quotation ${quote.quotationNumber} for your review.\n\nTotal: ${quote.currency} ${Number(quote.total).toFixed(2)}\n\nBest regards,\n${quote.salesperson?.firstName || 'Sales Team'}`;

    try {
      await this.communications.sendEmail(
        orgId,
        userId,
        {
          to: dto.to,
          subject,
          text: content,
          attachments: [
            {
              filename: `${quote.quotationNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        },
      );
    } catch (err: any) {
      throw new BadRequestException(`Failed to dispatch quotation email: ${err.message || 'Email provider not configured'}`);
    }

    // Update status to SENT
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.SENT,
        sentAt: new Date(),
      },
    });

    // Record Activity
    await this.prisma.activity.create({
      data: {
        organizationId: orgId,
        type: 'EMAIL',
        title: `Quotation ${quote.quotationNumber} Sent`,
        description: `Sent quotation to ${dto.to} via email.`,
        entityType: 'QUOTATION',
        entityId: id,
        customerId: quote.customerId,
        dealId: quote.opportunityId,
        createdById: userId,
      },
    });

    await this.events.publish('quotation.sent', {
      orgId,
      userId,
      quotationId: id,
      quotationNumber: quote.quotationNumber,
      recipient: dto.to,
    });

    return {
      message: 'Quotation sent successfully',
      quotation: updated,
    };
  }

  /**
   * Real customer acceptance workflow: transitions quote to ACCEPTED and atomically creates confirmed Sales Order.
   */
  async acceptQuotation(orgId: string, id: string, dto: AcceptQuotationDto, userId?: string, ipAddress?: string) {
    const quote = await this.findOne(orgId, id);

    // Idempotency check: if already accepted and has order, return existing order
    if (quote.status === QuotationStatus.ACCEPTED && quote.order) {
      return {
        message: 'Quotation already accepted',
        quotation: quote,
        order: quote.order,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update quotation status
      const updatedQuote = await tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedBy: dto.acceptedBy || quote.customer?.name || 'Customer',
          acceptedIp: ipAddress,
        },
      });

      // 2. Generate Sales Order number (SO-YYYY-XXXXX)
      const orderNumber = await this.sequences.getNextSequence(orgId, SequenceType.SALES_ORDER, 'SO');

      // 3. Create confirmed Sales Order
      const order = await tx.order.create({
        data: {
          organizationId: orgId,
          quotationId: id,
          orderNumber,
          customerId: quote.customerId,
          companyId: quote.companyId,
          contactId: quote.contactId,
          salespersonId: quote.salespersonId,
          salesTeamId: quote.salesTeamId,
          pricelistId: quote.pricelistId,
          currency: quote.currency,
          paymentTerms: quote.paymentTerms,
          status: OrderStatus.CONFIRMED,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          discount: quote.discountAmount,
          discountAmount: quote.discountAmount,
          total: quote.total,
          notes: quote.notes,
          confirmedAt: new Date(),
          confirmedById: userId || quote.salespersonId,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              productVariantId: item.productVariantId,
              name: item.description,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              taxRate: item.taxRate,
              discount: (Number(item.subtotal) * Number(item.discountPercent)) / 100,
              subtotal: item.subtotal,
              total: item.total,
              sequence: item.sequence,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      // 4. Update opportunity to WON if linked
      if (quote.opportunityId) {
        const wonStage = await tx.pipelineStage.findFirst({
          where: { pipelineId: quote.opportunity?.pipelineId || undefined, isWon: true, organizationId: orgId },
        });

        await tx.deal.update({
          where: { id: quote.opportunityId },
          data: {
            stage: 'WON',
            stageId: wonStage?.id,
            probability: 100,
            wonAt: new Date(),
            closedAt: new Date(),
          },
        });
      }

      // 5. Record Activity
      await tx.activity.create({
        data: {
          organizationId: orgId,
          type: 'STATUS_CHANGE',
          title: `Quotation ${quote.quotationNumber} Accepted`,
          description: `Quotation accepted by ${dto.acceptedBy || 'Customer'}. Generated Sales Order ${orderNumber}.`,
          entityType: 'QUOTATION',
          entityId: id,
          customerId: quote.customerId,
          dealId: quote.opportunityId,
          createdById: userId,
        },
      });

      // 6. Publish domain events (Quotation Accepted & Order Confirmed)
      await this.events.publish('quotation.accepted', {
        orgId,
        quotationId: id,
        quotationNumber: quote.quotationNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      await this.events.publish('sales.order.confirmed', {
        orgId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        total: order.total,
        lines: order.items,
        confirmedAt: order.confirmedAt,
      });

      return {
        message: 'Quotation accepted and Sales Order confirmed',
        quotation: updatedQuote,
        order,
      };
    });
  }

  async rejectQuotation(orgId: string, id: string, dto: RejectQuotationDto, userId?: string) {
    const quote = await this.findOne(orgId, id);
    if (quote.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot reject an already accepted quotation.');
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.REJECTED,
        rejectedAt: new Date(),
        rejectReason: dto.reason,
      },
    });

    await this.events.publish('quotation.rejected', {
      orgId,
      quotationId: id,
      reason: dto.reason,
    });

    return updated;
  }

  async cancelQuotation(orgId: string, id: string) {
    const quote = await this.findOne(orgId, id);
    if (quote.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot cancel an already accepted quotation.');
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.CANCELLED },
    });
  }

  async approveDiscount(orgId: string, id: string, approvedById: string) {
    const quote = await this.findOne(orgId, id);
    return this.prisma.quotation.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedById,
      },
    });
  }

  async remove(orgId: string, id: string) {
    const quote = await this.findOne(orgId, id);
    if (quote.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot delete accepted quotation.');
    }

    await this.prisma.quotation.delete({ where: { id } });
    return { message: 'Quotation deleted successfully' };
  }
}
