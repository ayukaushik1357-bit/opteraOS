import { BaseConnector, type ConnectorHealth } from "./base";
import type { ConnectorResult } from "../types";

export interface PaymentRequestInput {
  action: "create_payment_link" | "check_payment_status" | "reconcile_invoice" | "refund_payment" | string;
  amount: number;
  currency?: string | undefined;
  customerName?: string | undefined;
  customerEmail?: string | undefined;
  customerPhone?: string | undefined;
  description?: string | undefined;
  referenceId?: string | undefined;
  paymentId?: string | undefined;
  paymentLinkId?: string | undefined;
}

export interface PaymentRequestOutput {
  status: "created" | "paid" | "partially_paid" | "expired" | "cancelled" | "failed";
  paymentId?: string | undefined;
  paymentLinkId?: string | undefined;
  paymentUrl?: string | undefined;
  amount: number;
  currency: string;
  provider: string;
  verifiedAt: string;
}

export class PaymentsConnector extends BaseConnector<any, PaymentRequestInput, PaymentRequestOutput> {
  readonly name = "PaymentsConnector";
  readonly category = "finance";

  checkHealth(): ConnectorHealth {
    return {
      configured: false,
      provider: null,
      status: "not_configured",
      details: "Direct payment gateway integration is omitted in direct-access mode.",
    };
  }

  async execute(input: PaymentRequestInput, orgConfig?: any, idempotencyKey?: string): Promise<ConnectorResult<PaymentRequestOutput>> {
    return this.createBlockedResult(
      "Payments",
      "Payment processing gateway is disabled. Use direct Invoice status management in opteraOS.",
    );
  }
}

export const paymentsConnector = new PaymentsConnector();
