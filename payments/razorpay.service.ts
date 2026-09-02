// ============================================================================
// opteraOS Payments Engine — Direct Invoice Payment Collection
// (Direct Access Model: No SaaS Subscriptions, No User Paywalls)
// ============================================================================

export interface RazorpayOrderOptions {
  amount: number; // in INR
  currency?: string | undefined;
  receipt?: string | undefined;
  notes?: Record<string, any> | undefined;
}

export class RazorpayPaymentService {
  private keyId: string;
  private keySecret: string;

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || (typeof process !== 'undefined' && process.env ? (process.env['RAZORPAY_KEY_ID'] ?? '') : '');
    this.keySecret = keySecret || (typeof process !== 'undefined' && process.env ? (process.env['RAZORPAY_KEY_SECRET'] ?? '') : '');
  }

  /**
   * Generates a new Razorpay Order for one-off invoices or upfront payments.
   */
  async createOrder(options: RazorpayOrderOptions): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }> {
    const amountInPaise = Math.round(options.amount * 100);

    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: options.currency || 'INR',
        receipt: options.receipt || `rcpt_${Date.now()}`,
        notes: options.notes || {},
      }),
    });

    if (!response.ok) {
      let errDescription = response.statusText;
      try {
        const err = await response.json();
        if (err?.error?.description) errDescription = err.error.description;
      } catch {
        // fallback
      }
      throw new Error(`Razorpay Error: ${errDescription}`);
    }

    const orderData: any = await response.json();
    return {
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: this.keyId,
    };
  }

  /**
   * Generates client checkout options for the frontend Razorpay modal.
   */
  getCheckoutConfig(orderId: string, amount: number, customer: { name: string; email: string; phone?: string | undefined }) {
    return {
      key: this.keyId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'opteraOS',
      description: 'Business Subscription / Invoice Payment',
      image: 'https://opteraos.com/logo.png',
      order_id: orderId,
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.phone || '',
      },
      theme: {
        color: '#4f46e5',
      },
    };
  }
}
