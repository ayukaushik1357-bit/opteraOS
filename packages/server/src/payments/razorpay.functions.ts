import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─────────────────────────────────────────────────────────────────────────────
// Credential helpers — NEVER expose RAZORPAY_KEY_SECRET to the client.
// VITE_* prefixed env vars are bundled into the client; we deliberately
// exclude them so secrets stay server-only.
// ─────────────────────────────────────────────────────────────────────────────
function getRazorpayKeyId(): string | undefined {
  // Only read non-VITE env var so the key ID is also treated as server config.
  // The frontend receives it only via the getRazorpayPublicKey server fn below.
  return process.env["RAZORPAY_KEY_ID"];
}

function getRazorpayKeySecret(): string | undefined {
  return process.env["RAZORPAY_KEY_SECRET"];
}

/** Fetch with a hard timeout to prevent hanging server functions. */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getRazorpayPublicKey — returns only the Key ID (safe for client)
// ─────────────────────────────────────────────────────────────────────────────
export const getRazorpayPublicKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const keyId = getRazorpayKeyId();
    return {
      keyId: keyId || null,
      liveMode: Boolean(keyId && keyId.startsWith("rzp_live_")),
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// createRazorpayOrder
// ─────────────────────────────────────────────────────────────────────────────
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), invoiceId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();

    // 1. Fetch invoice — org_id check ensures cross-tenant isolation
    const { data: invoice, error: invErr } = await context.supabase
      .from("invoices")
      .select("id, amount, number, status, org_id")
      .eq("org_id", data.orgId)
      .eq("id", data.invoiceId)
      .single();

    if (invErr || !invoice) {
      throw new Error("Invoice not found or access denied.");
    }

    if (invoice.status === "paid") {
      throw new Error("This invoice has already been paid.");
    }

    if (Number(invoice.amount) <= 0) {
      throw new Error("Invoice amount must be greater than zero.");
    }

    const amountInPaise = Math.round(Number(invoice.amount) * 100);
    const receiptId = `rcpt_${invoice.number}_${Date.now()}`.slice(0, 40);

    // 2. Check for an existing payment record (idempotency)
    const { data: existingPayment } = await context.supabase
      .from("payments")
      .select("razorpay_order_id, status")
      .eq("org_id", data.orgId)
      .eq("invoice_id", data.invoiceId)
      .eq("status", "created")
      .maybeSingle();

    if (existingPayment?.razorpay_order_id) {
      return {
        orderId: existingPayment.razorpay_order_id,
        amount: amountInPaise,
        currency: "INR",
        keyId: keyId || null,
        invoiceNumber: invoice.number,
      };
    }

    let razorpayOrderId: string | null = null;
    let razorpayError: string | null = null;

    // 3. Call Razorpay API if credentials are configured
    if (keyId && keySecret) {
      try {
        const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const res = await fetchWithTimeout(
          "https://api.razorpay.com/v1/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify({
              amount: amountInPaise,
              currency: "INR",
              receipt: receiptId,
              notes: { invoice_id: invoice.id, org_id: data.orgId },
            }),
          },
          15_000,
        );

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          if (res.status === 429) {
            throw new Error("Razorpay rate limit exceeded. Please retry in a moment.");
          }
          throw new Error(
            (errBody as any)?.error?.description || `Razorpay Order Error ${res.status}`,
          );
        }

        const rzpOrder = await res.json();
        razorpayOrderId = rzpOrder.id;
      } catch (err: any) {
        // AbortError means timeout
        if (err.name === "AbortError") {
          throw new Error("Razorpay API timed out. Please try again.");
        }
        // Re-throw known Razorpay/rate-limit errors
        if (err.message?.includes("Razorpay")) throw err;
        console.error("[optera Payments] Razorpay order creation failed:", err.message);
        razorpayError = err.message;
      }
    }

    // 4. Persist payment record in DB
    if (razorpayOrderId) {
      await context.supabase.from("payments").insert({
        org_id: data.orgId,
        invoice_id: data.invoiceId,
        razorpay_order_id: razorpayOrderId,
        amount: Number(invoice.amount),
        currency: "INR",
        status: "created",
      });
    }

    return {
      orderId: razorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: keyId || null,
      invoiceNumber: invoice.number,
      configurationRequired: !keyId || !keySecret,
      error: razorpayError,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// verifyRazorpayPayment — called after the Razorpay Checkout JS succeeds
// ─────────────────────────────────────────────────────────────────────────────
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        invoiceId: z.string().uuid(),
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const keySecret = getRazorpayKeySecret();

    // 1. Verify org membership and invoice ownership
    const { data: invoice, error: invErr } = await context.supabase
      .from("invoices")
      .select("id, status, org_id")
      .eq("org_id", data.orgId)
      .eq("id", data.invoiceId)
      .single();

    if (invErr || !invoice) {
      throw new Error("Invoice not found or access denied.");
    }

    // 2. Verify HMAC-SHA256 signature (mandatory when secret is configured)
    if (keySecret) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
        .digest("hex");

      if (generatedSignature !== data.razorpaySignature) {
        // Record the failed verification attempt
        await context.supabase.from("payments").insert({
          org_id: data.orgId,
          invoice_id: data.invoiceId,
          razorpay_order_id: data.razorpayOrderId,
          razorpay_payment_id: data.razorpayPaymentId,
          razorpay_signature: data.razorpaySignature,
          amount: 0,
          status: "failed",
          error_description: "Signature verification failed",
        });
        throw new Error(
          "Security Alert: Payment signature verification failed. No charge was applied.",
        );
      }
    }

    // 3. Update payment record to captured
    await context.supabase
      .from("payments")
      .update({
        status: "captured",
        razorpay_payment_id: data.razorpayPaymentId,
        razorpay_signature: data.razorpaySignature,
      })
      .eq("org_id", data.orgId)
      .eq("razorpay_order_id", data.razorpayOrderId);

    // 4. Mark invoice as paid
    const { error: invUpdateErr } = await context.supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("org_id", data.orgId)
      .eq("id", data.invoiceId);

    if (invUpdateErr) throw new Error(invUpdateErr.message);

    return { ok: true, status: "paid" };
  });

// ─────────────────────────────────────────────────────────────────────────────
// listPayments — fetch payment records for an invoice
// ─────────────────────────────────────────────────────────────────────────────
export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), invoiceId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: payments, error } = await context.supabase
      .from("payments")
      .select("id, razorpay_order_id, razorpay_payment_id, amount, status, created_at")
      .eq("org_id", data.orgId)
      .eq("invoice_id", data.invoiceId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return payments ?? [];
  });
