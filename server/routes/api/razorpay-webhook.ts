/**
 * Razorpay Webhook Handler — Nitro Route
 *
 * Route: POST /api/razorpay-webhook
 * Delegates to the pure web-standard handleRazorpayWebhookRequest.
 */

import { defineEventHandler } from "h3";
import { handleRazorpayWebhookRequest } from "@optera/server/payments";

export default defineEventHandler(async (event) => {
  const req = (event as any).request ?? (event as any).web?.request ?? event;
  return handleRazorpayWebhookRequest(req as Request);
});
