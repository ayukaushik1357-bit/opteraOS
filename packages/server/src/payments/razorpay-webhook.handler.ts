/**
 * razorpay-webhook.handler.ts
 *
 * Core web-standard Razorpay Webhook Handler.
 *
 * Can be invoked directly from standard Request/Response environments
 * (Cloudflare Workers, Nitro, Node.js server).
 *
 * Security Model:
 *  1. HMAC-SHA256 signature verification over exact raw request body text
 *  2. Constant-time timing-safe comparison (crypto.timingSafeEqual)
 *  3. Idempotency enforcement via processed_webhook_events deduplication
 *  4. Strict Org Isolation: org_id resolved strictly from internal payments record
 *  5. Server-side service-role client (SUPABASE_SERVICE_ROLE_KEY)
 *  6. No client-side exposure of any secret keys
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function getWebhookSecret(): string | undefined {
  return process.env["RAZORPAY_WEBHOOK_SECRET"];
}

function getServiceSupabase() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url) throw new Error("[optera Webhook] SUPABASE_URL is not configured");
  if (!serviceKey) {
    throw new Error(
      "[optera Webhook] SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Required for server-to-server webhook DB persistence.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleRazorpayWebhookRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 1. Read raw body BEFORE JSON parsing (required for HMAC verification)
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ error: "Failed to read request body" }, 400);
  }

  // 2. Verify HMAC-SHA256 signature
  const webhookSecret = getWebhookSecret();
  const signature = request.headers.get("x-razorpay-signature");

  if (webhookSecret) {
    if (!signature) {
      console.warn("[optera Webhook] Request missing x-razorpay-signature header");
      return jsonResponse({ error: "Missing x-razorpay-signature header" }, 401);
    }

    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    let signaturesMatch = false;
    try {
      signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSig, "hex"),
        Buffer.from(signature, "hex"),
      );
    } catch {
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      console.warn("[optera Webhook] Invalid Razorpay signature rejected");
      return jsonResponse({ error: "Signature verification failed" }, 401);
    }

    console.info("[optera Webhook] Signature verified OK");
  } else {
    console.warn(
      "[optera Webhook] RAZORPAY_WEBHOOK_SECRET is not set. Signature verification skipped (dev mode).",
    );
  }

  // 3. Parse JSON payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const eventId: string = payload.id ?? payload.event_id ?? "";
  const eventType: string = payload.event ?? "";

  if (!eventId) {
    return jsonResponse({ error: "Missing event id" }, 400);
  }

  console.info(`[optera Webhook] Processing event: ${eventType} (id: ${eventId})`);

  // 4. Initialize Supabase service-role client
  let supabase: ReturnType<typeof getServiceSupabase>;
  try {
    supabase = getServiceSupabase();
  } catch (err: any) {
    console.error("[optera Webhook] Supabase service client error:", err.message);
    return jsonResponse({ error: "Database service unavailable" }, 503);
  }

  // 5. Idempotency Check
  const { data: existing, error: idempotencyErr } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (idempotencyErr) {
    console.warn("[optera Webhook] Idempotency check DB error:", idempotencyErr.message);
  }

  if (existing) {
    console.info(`[optera Webhook] Event ${eventId} already processed — returning success`);
    return jsonResponse({ status: "already_processed" });
  }

  // 6. Process Event
  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      const entity = paymentEntity ?? orderEntity;

      const rzpOrderId: string = paymentEntity?.order_id ?? orderEntity?.id ?? "";
      const rzpPaymentId: string = paymentEntity?.id ?? entity?.payment_id ?? "";

      if (rzpOrderId) {
        // Look up payment by razorpay_order_id — org_id is resolved internally
        const { data: paymentRecord, error: lookupErr } = await supabase
          .from("payments")
          .select("id, org_id, invoice_id, status")
          .eq("razorpay_order_id", rzpOrderId)
          .maybeSingle();

        if (lookupErr) {
          console.warn("[optera Webhook] Payment lookup error:", lookupErr.message);
        }

        if (paymentRecord) {
          if (paymentRecord.status !== "captured") {
            // Update payment record
            await supabase
              .from("payments")
              .update({
                status: "captured",
                ...(rzpPaymentId ? { razorpay_payment_id: rzpPaymentId } : {}),
              })
              .eq("id", paymentRecord.id);

            // Update associated invoice strictly within the resolved org_id
            if (paymentRecord.invoice_id) {
              await supabase
                .from("invoices")
                .update({
                  status: "paid",
                  paid_at: new Date().toISOString(),
                })
                .eq("org_id", paymentRecord.org_id)
                .eq("id", paymentRecord.invoice_id);

              console.info(
                `[optera Webhook] Invoice ${paymentRecord.invoice_id} marked as paid (org: ${paymentRecord.org_id})`,
              );
            }
          }
        } else {
          console.warn(
            `[optera Webhook] No payment record found for order_id ${rzpOrderId}`,
          );
        }
      }
    } else if (eventType === "payment.failed") {
      const entity = payload.payload?.payment?.entity;
      const rzpOrderId: string = entity?.order_id ?? "";

      if (rzpOrderId) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            ...(entity?.error_code ? { error_code: entity.error_code } : {}),
            error_description: entity?.error_description ?? "Payment failed",
          })
          .eq("razorpay_order_id", rzpOrderId);
      }
    } else if (eventType === "refund.created") {
      const entity = payload.payload?.refund?.entity;
      const rzpPaymentId: string = entity?.payment_id ?? "";

      if (rzpPaymentId) {
        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("razorpay_payment_id", rzpPaymentId);
      }
    }
  } catch (processingErr: any) {
    console.error("[optera Webhook] Event processing error:", processingErr.message);
  }

  // 7. Record event as processed
  const { error: insertErr } = await supabase.from("processed_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (insertErr) {
    console.error("[optera Webhook] Failed to record processed event:", insertErr.message);
    return jsonResponse({ error: "Failed to persist event record" }, 500);
  }

  return jsonResponse({ status: "success" });
}
