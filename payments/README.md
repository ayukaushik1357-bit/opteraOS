# opteraOS Payments Engine

This module provides enterprise-grade payment collection, subscription billing, and webhook verification via **Razorpay** (India / INR) and **Stripe** (International).

---

## Security Model

1. **Never trust frontend payment callbacks alone**: All payment receipts require cryptographic verification (`HMAC-SHA256`) against the backend secret before unlocking tenant subscriptions or marking invoices as `PAID`.
2. **Server-Side Secrets**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are never exposed to browser client bundles.

---

## Payment Lifecycle

```
User selects Plan / Invoice
        │
        ▼
Backend API creates Razorpay Order (`/api/orgs/:orgId/payments/create-order`)
        │
        ▼
Frontend opens Razorpay Checkout Modal
        │
        ▼
Customer completes payment (UPI, Cards, NetBanking)
        │
        ├──► 1. Frontend sends Payment ID + Signature to `/api/orgs/:orgId/payments/verify`
        │        (Verifies HMAC signature, updates Invoice/Subscription status)
        │
        └──► 2. Razorpay sends asynchronous Webhook to `/api/webhooks/razorpay`
                 (Guarantees fulfillment even if user closes the browser)
```

---

## Environment Variables

```env
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"
```
