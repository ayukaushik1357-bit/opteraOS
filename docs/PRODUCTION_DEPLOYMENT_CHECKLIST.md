# opteraOS — Production Deployment & Live Verification Checklist

**Project:** opteraOS — AI Business Operating System  
**Version:** 1.0.0-production-candidate  
**Date:** 2026-08-14  

---

## 1. Overview

This document provides the mandatory step-by-step procedure to transition an opteraOS instance from repository code to a fully operational, multi-tenant SaaS deployment in production.

---

## 2. Step-by-Step Deployment Procedure

### Phase A: Supabase Backend Provisioning

1. **Database Schema & Migrations Execution**
   Apply the following migrations sequentially on the target Supabase Postgres cluster (via Supabase SQL Editor or Supabase CLI):

   | Execution Order | Migration File | Purpose |
   |---|---|---|
   | 1 | `20260808190749_9e232a39-3088-404c-9834-2f5471e86681.sql` | Core Schema: Organizations, Members, Invites, Customers, Deals, Invoices, RLS Helper Functions |
   | 2 | `20260808190815_38bb2138-f84a-4886-8f16-7e517c0c9279.sql` | Security: Tighten function execution grants |
   | 3 | `20260811083412_fc378807-4902-44e9-bcd4-631b8d4e8c03.sql` | Table Grants: Grant CRUD on core tables to authenticated/service_role |
   | 4 | `20260811083608_22d19a42-2dc0-4ee1-a07a-a2af571af54c.sql` | RLS Fix: Add "owner can view own org" policy |
   | 5 | `20260811153000_create_leads_table.sql` | Leads: Stage enum, `leads` table, indexes, RLS |
   | 6 | `20260811160000_create_ai_core_tables.sql` | AI Core: `ai_conversations`, `ai_messages`, `ai_insights`, `ai_action_logs`, RLS |
   | 7 | `20260814100000_create_tasks_activities_workflows_tables.sql` | Operations: `tasks`, `activities`, `notifications`, `workflows`, `workflow_executions`, RLS |
   | 8 | `20260814110000_create_rag_knowledge_base_tables.sql` | RAG: Enable pgvector, `documents`, `document_chunks`, `match_document_chunks` RPC |
   | 9 | `20260814120000_create_payments_and_webhooks_tables.sql` | Payments: `payments`, `processed_webhook_events`, RLS |
   | 10 | `20260814130000_add_invoice_line_items.sql` | Invoices: Add `line_items jsonb`, `invoice_number`, `tax_rate` to `invoices` |
   | 11 | `20260814140000_fix_rag_rpc_and_webhook_grants.sql` | Optimization: Return `metadata` in RAG RPC, HNSW vector index, webhook grants |

2. **Supabase Authentication Settings**
   - In Supabase Dashboard → Authentication → URL Configuration:
     - **Site URL**: `https://your-domain.com`
     - **Redirect URLs**: `https://your-domain.com/**`, `http://localhost:5173/**` (for local development).
   - In Email Templates: configure branded confirmation and invitation emails.

3. **Multi-Tenancy RLS Verification**
   Run the following verification query in Supabase SQL Editor to confirm RLS is active on every business table:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   -- Every table must return rowsecurity = true
   ```

---

### Phase B: Environment Variables Configuration

Set the following environment variables in your hosting provider (Cloudflare Pages / Vercel / Docker):

#### Client-Safe Variables (Bundled into frontend JS)
```ini
VITE_SUPABASE_PROJECT_ID="your_supabase_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
VITE_SUPABASE_URL="https://your_project.supabase.co"
```

#### Server-Only Secrets (NEVER prefix with VITE_)
```ini
SUPABASE_PROJECT_ID="your_supabase_project_id"
SUPABASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
SUPABASE_URL="https://your_project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

#### AI Provider Secrets (Server-Only)
```ini
GEMINI_API_KEY="your_gemini_api_key"
# Optional fallback:
OPENAI_API_KEY="your_openai_api_key"
```

#### Payment Gateway Secrets (Server-Only)
```ini
RAZORPAY_KEY_ID="rzp_live_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_configured_webhook_secret"
```

#### Workflow & Automation (Server-Only)
```ini
N8N_WEBHOOK_BASE_URL="https://your-n8n-instance.com/webhook"
```

---

### Phase C: Razorpay Live Integration Setup

1. **KYC & Account Activation**: Complete business KYC in Razorpay Dashboard.
2. **API Keys Generation**: Generate Live Key ID (`rzp_live_...`) and Secret from Settings → API Keys.
3. **Webhook Endpoint Registration**:
   - In Razorpay Dashboard → Settings → Webhooks → Add New Webhook:
     - **Webhook URL**: `https://your-domain.com/api/razorpay-webhook`
     - **Secret**: Generate a secure 32+ character random string (save to `RAZORPAY_WEBHOOK_SECRET`).
     - **Active Events**:
       - `payment.captured`
       - `payment.failed`
       - `order.paid`
       - `refund.created`
4. **End-to-End Payment Flow Verification**:
   - Create test invoice in `/invoices`.
   - Click **Pay Now** to launch modal checkout.
   - Complete test transaction.
   - Verify payment record is saved in `payments` and invoice status transitions to `paid`.
   - Verify webhook arrives at `/api/razorpay-webhook` and is deduplicated in `processed_webhook_events`.

---

### Phase D: RAG & Google Gemini Verification

1. **API Key Generation**: Obtain key from Google AI Studio.
2. **Quota & Rate Limits**: Confirm tier accommodates text embedding (`text-embedding-004`) and chat (`gemini-1.5-flash`).
3. **End-to-End Pipeline Verification**:
   - Upload sample SOP document (`.txt` or `.md`) in `/knowledge`.
   - Confirm chunks are generated with non-null embeddings in `document_chunks`.
   - Execute search in Knowledge base and confirm `search_type: "semantic"` badge appears.
   - Open AI Assistant Drawer and ask a question grounded in the uploaded document content.

---

### Phase E: n8n Automation Engine Connection

1. **n8n Workflow Setup**: Configure webhook trigger in n8n listening for JSON payload `{ event, orgId, timestamp, data }`.
2. **Register in opteraOS**: Add workflow in `/workflows` with target event (e.g. `customer.created`) and target webhook URL.
3. **Execution Verification**: Create a customer and verify the execution record appears in the **History** tab with status `successful`.

---

### Phase F: Production Build & Hosting

1. **Execute Production Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
2. **Deploy to Cloudflare Pages / Workers**:
   ```bash
   npx wrangler deploy
   ```
3. **Verify Public Route Availability**:
   - `GET /` (Marketing Landing Page)
   - `GET /auth` (Sign in / Sign up)
   - `POST /api/razorpay-webhook` (Returns 400/401 for empty request, 200 for valid signed event)

---

### Phase G: Post-Deployment Smoke Test Suite

- [ ] Sign up new test user account.
- [ ] Complete onboarding and create organization workspace.
- [ ] Add 1 customer, 1 lead, 1 deal, 1 task.
- [ ] Create 1 invoice with 2 itemized line items and GST tax.
- [ ] Download PDF invoice and inspect print layout.
- [ ] Upload knowledge document and verify semantic RAG search.
- [ ] Open AI Assistant Drawer, send a query, approve an AI Action Card.
- [ ] Navigate to `/analytics` and verify charts, date filters, and CSV export.
- [ ] Invite team member in `/team` and accept invite in incognito window.
- [ ] Switch between workspaces via top navbar and confirm tenant isolation.
