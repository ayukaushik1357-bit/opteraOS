import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private getRazorpay() {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) throw new BadRequestException('Razorpay not configured');
    // Dynamic import to avoid issues when package not installed
    const Razorpay = require('razorpay');
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(orgId: string, dto: { amount: number; currency?: string; invoiceId?: string; notes?: any }) {
    const razorpay = this.getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(dto.amount * 100), // Convert to paise
      currency: dto.currency ?? 'INR',
      notes: { orgId, invoiceId: dto.invoiceId, ...dto.notes },
    });

    if (dto.invoiceId) {
      await this.prisma.invoice.update({ where: { id: dto.invoiceId }, data: { razorpayOrderId: order.id } });
    }

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: this.config.get('RAZORPAY_KEY_ID'),
    };
  }

  async verifyPayment(orgId: string, dto: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; invoiceId?: string }) {
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) throw new BadRequestException('Razorpay not configured');

    // SECURITY: Verify HMAC-SHA256 signature
    const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const expectedSignature = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Payment verification failed: invalid signature');
    }

    // Record payment
    const razorpay = this.getRazorpay();
    const paymentDetails = await razorpay.payments.fetch(dto.razorpayPaymentId);

    const payment = await this.prisma.payment.create({
      data: {
        organizationId: orgId,
        invoiceId: dto.invoiceId,
        amount: Number(paymentDetails.amount) / 100,
        currency: paymentDetails.currency,
        status: 'COMPLETED',
        method: paymentDetails.method,
        razorpayOrderId: dto.razorpayOrderId,
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
        paidAt: new Date(),
      },
    });

    // Update invoice if provided
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
      if (invoice) {
        const newPaid = Number(invoice.amountPaid) + Number(payment.amount);
        const newStatus = newPaid >= Number(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';
        await this.prisma.invoice.update({ where: { id: dto.invoiceId }, data: { status: newStatus, amountPaid: newPaid, paidAt: newStatus === 'PAID' ? new Date() : undefined } });
      }
    }

    return { success: true, payment };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');

    if (secret) {
      const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (expectedSig !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = JSON.parse(rawBody.toString());
    this.logger.log(`Razorpay webhook: ${event.event}`);

    switch (event.event) {
      case 'payment.captured': {
        const { payload: { payment: { entity } } } = event;
        const orgId = entity.notes?.orgId;
        const invoiceId = entity.notes?.invoiceId;
        if (orgId) {
          await this.prisma.payment.upsert({
            where: { razorpayPaymentId: entity.id },
            update: { status: 'COMPLETED', paidAt: new Date() },
            create: {
              organizationId: orgId, invoiceId, amount: entity.amount / 100, currency: entity.currency,
              status: 'COMPLETED', razorpayPaymentId: entity.id, razorpayOrderId: entity.order_id, paidAt: new Date(),
            },
          });
          if (invoiceId) {
            const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
            if (invoice) {
              const newPaid = Number(invoice.amountPaid) + entity.amount / 100;
              const newStatus = newPaid >= Number(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';
              await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: newStatus, amountPaid: newPaid, paidAt: newStatus === 'PAID' ? new Date() : undefined } });
            }
          }
        }
        break;
      }
      case 'subscription.activated':
      case 'subscription.charged': {
        const sub = event.payload?.subscription?.entity;
        if (sub?.notes?.orgId) {
          await this.prisma.subscription.update({
            where: { organizationId: sub.notes.orgId },
            data: { status: 'ACTIVE', razorpaySubscriptionId: sub.id, currentPeriodEnd: sub.charge_at ? new Date(sub.charge_at * 1000) : undefined },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  async getSubscriptionConfig() {
    return {
      keyId: this.config.get('RAZORPAY_KEY_ID'),
      plans: {
        STARTER: { monthly: 'plan_starter_monthly', yearly: 'plan_starter_yearly', price: { monthly: 1499, yearly: 14999 } },
        GROWTH: { monthly: 'plan_growth_monthly', yearly: 'plan_growth_yearly', price: { monthly: 3999, yearly: 39999 } },
        BUSINESS: { monthly: 'plan_business_monthly', yearly: 'plan_business_yearly', price: { monthly: 8999, yearly: 89999 } },
      },
    };
  }
}
