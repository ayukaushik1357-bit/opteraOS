/**
 * Frontend payment abstraction.
 * Razorpay will be wired through the backend later — no keys ever live here.
 */
export type BillingCycle = "monthly" | "yearly";

export type CheckoutIntent = {
  planId: string;
  planName: string;
  cycle: BillingCycle;
  amount: number | null;
  currency: "INR";
};

export type CheckoutResult =
  | { status: "pending_backend"; message: string; intent: CheckoutIntent }
  | { status: "contact_sales"; message: string; intent: CheckoutIntent };

export const paymentService = {
  async startCheckout(intent: CheckoutIntent): Promise<CheckoutResult> {
    // Simulated latency so the UI can exercise its loading state.
    await new Promise((r) => setTimeout(r, 600));
    if (intent.amount === null) {
      return { status: "contact_sales", message: "Our team will reach out to scope your deployment.", intent };
    }
    return {
      status: "pending_backend",
      message: "Payment integration coming next. This checkout is a frontend preview — no charge was made.",
      intent,
    };
  },
};
