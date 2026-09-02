// ============================================================================
// opteraOS Payments Engine — Razorpay Webhook Security Handler
// Cryptographically verifies HMAC-SHA256 signatures for payment events
// ============================================================================

import * as crypto from 'crypto';

export interface WebhookEventPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        method: string;
        notes?: Record<string, any> | undefined;
      };
    } | undefined;
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        charge_at: number;
        notes?: Record<string, any> | undefined;
      };
    } | undefined;
    order?: {
      entity: {
        id: string;
        amount: number;
        status: string;
      };
    } | undefined;
  };
  created_at: number;
}

export class PaymentWebhookHandler {
  private webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret =
      webhookSecret ||
      (typeof process !== 'undefined' && process.env
        ? (process.env['RAZORPAY_WEBHOOK_SECRET'] ?? '')
        : '');
  }

  /**
   * Validates Razorpay Webhook HMAC-SHA256 signature against the raw request body.
   */
  verifySignature(rawBody: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set. Skipping signature validation in development mode.');
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Verifies client-side Razorpay payment completion signature.
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
    try {
      const payload = `${orderId}|${paymentId}`;
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      return expected === signature;
    } catch {
      return false;
    }
  }
}
