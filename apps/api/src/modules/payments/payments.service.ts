import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService) {}

  async recordInvoicePayment(orgId: string, dto: { invoiceId: string; amount: number; method?: string; notes?: string }) {
    const payment = await this.prisma.payment.create({
      data: {
        organizationId: orgId,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        currency: 'INR',
        status: 'COMPLETED',
        method: dto.method || 'DIRECT',
        paidAt: new Date(),
      },
    });

    const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
    if (invoice) {
      const newPaid = Number(invoice.amountPaid) + Number(dto.amount);
      const newStatus = newPaid >= Number(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';
      await this.prisma.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          status: newStatus,
          amountPaid: newPaid,
          paidAt: newStatus === 'PAID' ? new Date() : undefined,
        },
      });
    }

    return { success: true, payment };
  }

  async getPayments(orgId: string) {
    return this.prisma.payment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
