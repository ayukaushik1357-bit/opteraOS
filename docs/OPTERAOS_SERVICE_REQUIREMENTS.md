# OPTERAOS — SERVICE REQUIREMENTS AUDIT
**Generated**: 2026-09-01  
**Scope**: All external dependencies, environment variables, integration modules, and service constructors  
**Method**: Code inspection + live port scan — no secret values exposed

---

## AUDIT SUMMARY

| Service | Configured | Code Detects | Connection | Blocking |
|---|---|---|---|---|
| Supabase (Auth + DB) | ✅ YES | ✅ YES | ✅ PASS | None |
| Gemini AI | ✅ YES | ✅ YES | ⚠️ UNTESTED | None (fallback exists) |
| Google OAuth | ✅ YES | ✅ YES | ⚠️ UNTESTED | None |
| NestJS REST API (Port 3001) | ❌ NOT RUNNING | ✅ YES | ❌ FAIL | **CRITICAL — Leads, Deals, Invoices, Payments** |
| PostgreSQL (NestJS/Prisma) | ❌ NO .env | ✅ YES | ❌ FAIL | All NestJS REST routes |
| Razorpay | ❌ NOT SET | ✅ YES | ❌ FAIL | Payments |
| n8n Webhooks | ❌ NOT SET | ✅ YES | ❌ FAIL | Automations |
| Email (SMTP/Resend/SendGrid) | ❌ NOT SET | ⚠️ PARTIAL | ❌ FAIL | Invite emails, password reset |
| Redis | ❌ NOT SET | ✅ YES | ❌ FAIL | NestJS rate limiting / queue |
| Apple OAuth | ❌ NOT SET | ✅ YES | ❌ BLOCKED | Apple Sign-In (gracefully returns error) |
| OpenAI | ❌ NOT SET | ✅ YES | ❌ FAIL | AI fallback (Gemini is primary — OK) |
| SUPABASE_SERVICE_ROLE_KEY | ❌ NOT SET | ✅ YES | ❌ FAIL | Admin ops, Razorpay webhooks, OAuth user provisioning |

---

## 1. SUPABASE (Auth + Database)

| Field | Value |
|---|---|
| **Service** | Supabase (Auth, PostgREST, Realtime) |
| **Purpose** | Primary database for all frontend RPC functions; auth identity provider |
| **Required For** | All `*.functions.ts` server functions (leads, crm, deals, invoices, AI, notifications) |
| **Environment Variables** | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Configured** | ✅ YES — all four present in `.env` |
| **Code Detects Configuration** | ✅ YES — [`auth-middleware.ts`](file:///d:/OPTERAOS/optera-os-ai-core/src/integrations/supabase/auth-middleware.ts) throws explicitly with missing var names |
| **Connection Test** | ✅ PASS — URL resolves to `https://zoyhmqerdehetsveyrjz.supabase.co` |
| **Missing Var** | `SUPABASE_SERVICE_ROLE_KEY` — **NOT IN `.env`** (see Section 1b below) |
| **Actual Error** | None for public queries. Admin ops and webhook handler will throw: `Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY` |
| **Blocking Features** | Razorpay webhooks, Google OAuth user provisioning (`resolveAndProvisionUser`) |

### 1b. SUPABASE_SERVICE_ROLE_KEY — MISSING

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY` is **required** by:
> - [`packages/server/src/db/client.server.ts`](file:///d:/OPTERAOS/optera-os-ai-core/packages/server/src/db/client.server.ts) — used by `supabaseAdmin` (OAuth user provisioning, workspace creation)
> - [`packages/server/src/payments/razorpay-webhook.handler.ts`](file:///d:/OPTERAOS/optera-os-ai-core/packages/server/src/payments/razorpay-webhook.handler.ts) — webhook DB persistence requires service role
> - [`server/routes/api/auth/me.get.ts`](file:///d:/OPTERAOS/optera-os-ai-core/server/routes/api/auth/me.get.ts) — uses `supabaseAdmin`
>
> **Add to `.env`**: `SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"`  
> Found in: Supabase Dashboard → Project Settings → API → **service_role** (secret key)

---

## 2. GEMINI AI

| Field | Value |
|---|---|
| **Service** | Google Gemini API (`gemini-3.6-flash`, `text-embedding-004`) |
| **Purpose** | AI chat responses, RAG document embeddings, lead scoring AI |
| **Required For** | `sendChatMessage`, `generateEmbedding`, `generateAIResponse` |
| **Environment Variables** | `GEMINI_API_KEY` or `GOOGLE_API_KEY` |
| **Configured** | ✅ YES — both present in `.env` |
| **Code Detects Configuration** | ✅ YES — [`ai.service.ts`](file:///d:/OPTERAOS/optera-os-ai-core/src/lib/ai/ai.service.ts) L515–532 reads `process.env["GEMINI_API_KEY"] \|\| process.env["GOOGLE_API_KEY"]` |
| **Connection Test** | ⚠️ UNTESTED (key present, network call not verified — deterministic fallback catches all failures) |
| **Actual Error** | None at startup. API call failure would log: `[optera AI] Gemini call failed, trying OpenAI: ...` and fall through to deterministic fallback |
| **Blocking Features** | None — deterministic fallback is active when Gemini fails. RAG embeddings silently degrade to keyword search |

> [!NOTE]
> The code calls `gemini-3.6-flash` at [`ai.service.ts:L126`](file:///d:/OPTERAOS/optera-os-ai-core/src/lib/ai/ai.service.ts#L126). Verify this model name is valid — the standard public model name is `gemini-1.5-flash` or `gemini-2.0-flash`. A wrong model name will cause a 404 from the API and silently fall to the deterministic engine.

---

## 3. GOOGLE OAUTH

| Field | Value |
|---|---|
| **Service** | Google OAuth 2.0 |
| **Purpose** | Social sign-in via "Sign in with Google" |
| **Required For** | `initiateGoogleOAuth`, `exchangeGoogleOAuthCode` |
| **Environment Variables** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Configured** | ✅ YES — both present in `.env` |
| **Code Detects Configuration** | ✅ YES — [`oauth.service.ts`](file:///d:/OPTERAOS/optera-os-ai-core/packages/server/src/auth/oauth.service.ts) throws descriptive error if missing |
| **Connection Test** | ⚠️ UNTESTED — depends on Google OAuth credentials being registered for the correct redirect URI |
| **Actual Error** | None at startup. Code correctly gates on `GOOGLE_CLIENT_ID` presence |
| **Blocking Features** | None (email/password auth is independent) |
| **Note** | `resolveAndProvisionUser` requires `SUPABASE_SERVICE_ROLE_KEY` — see Section 1b |

---

## 4. NESTJS REST API — ❌ CRITICAL: NOT RUNNING

| Field | Value |
|---|---|
| **Service** | NestJS REST API server (`apps/api/`) |
| **Purpose** | Serves all `/api/orgs/{orgId}/leads`, `/api/orgs/{orgId}/deals`, `/api/invoices`, `/api/payments`, etc. |
| **Required For** | Every `leadsApi.*`, `dealsApi.*`, `invoicesApi.*`, `paymentsApi.*` call from the UI |
| **Expected Port** | `3001` (from `apps/api/.env.example` line 8: `PORT=3001`) |
| **Live Port Scan** | ❌ **Port 3001 is NOT listening** — confirmed via `netstat` |
| **Connection Test** | ❌ FAIL — no process bound to port 3001 |
| **Blocking Features** | **ALL lead operations, deal operations, invoice operations, payment operations** |

> [!CAUTION]
> **This is the primary cause of "Failed to fetch" on Save & Score Lead.**

### Why The Client Hits Port 3001

[`src/lib/api/client.ts`](file:///d:/OPTERAOS/optera-os-ai-core/src/lib/api/client.ts) L7–11:
```typescript
export const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'     // ← hard-coded when running on localhost
    : '/api');
```
Every `leadsApi.create()` call → `POST http://localhost:3001/api/orgs/{orgId}/leads` → **connection refused** → browser reports "Failed to fetch".

### What Needs To Run

The NestJS API must be started separately:
```bash
cd apps/api
# Create apps/api/.env from apps/api/.env.example first
npm run start:dev
```
It requires its own `.env` in `apps/api/` which does **not currently exist** (only `.env.example` is present).

---

## 5. POSTGRESQL / PRISMA (NestJS)

| Field | Value |
|---|---|
| **Service** | PostgreSQL database via Prisma ORM |
| **Purpose** | NestJS REST API's data store for all domain entities |
| **Required For** | All NestJS `*.service.ts` database queries |
| **Environment Variables** | `DATABASE_URL` |
| **Configured** | ❌ NO — `DATABASE_URL` is **absent from root `.env`**; only present in `apps/api/.env.example` |
| **Code Detects Configuration** | ✅ YES — Prisma throws at startup if `DATABASE_URL` is missing |
| **Connection Test** | ❌ FAIL — NestJS is not running |
| **Actual Error** | NestJS startup would fail: `Error: Environment variable not found: DATABASE_URL` |
| **Blocking Features** | All NestJS REST operations |
| **Note** | MySQL (port 3306) IS listening locally — this may be a development MySQL/MariaDB. Prisma schema uses PostgreSQL. |

---

## 6. RAZORPAY (Payments)

| Field | Value |
|---|---|
| **Service** | Razorpay Payment Gateway |
| **Purpose** | Create payment orders for invoices; verify payments; handle webhooks |
| **Required For** | `createRazorpayOrder`, `verifyRazorpayPayment`, `createSubscriptionOrder`, `POST /api/razorpay-webhook` |
| **Environment Variables** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| **Configured** | ❌ NOT SET — none of these are in root `.env` |
| **Code Detects Configuration** | ✅ YES — [`razorpay.functions.ts`](file:///d:/OPTERAOS/optera-os-ai-core/packages/server/src/payments/razorpay.functions.ts) L58–62 checks for key before creating order; returns `{ keyId: null }` for public key endpoint |
| **Connection Test** | ❌ FAIL — no key present |
| **Actual Error** | Order creation will throw: `BLOCKED_BY_CONFIGURATION: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set` |
| **Blocking Features** | Invoice payment collection, subscription billing |

---

## 7. N8N (Workflow Automation)

| Field | Value |
|---|---|
| **Service** | n8n self-hosted workflow automation |
| **Purpose** | Execute business automation workflows triggered by CRM events |
| **Required For** | `AutomationsService`, workflow trigger endpoints |
| **Environment Variables** | `N8N_WEBHOOK_BASE_URL`, `N8N_API_KEY` |
| **Configured** | ❌ NOT SET — neither present in root `.env` |
| **Code Detects Configuration** | ✅ YES — workflow execution degrades gracefully; webhook calls would fail at runtime |
| **Connection Test** | ❌ FAIL — no URL configured |
| **Actual Error** | Workflow HTTP triggers will fail silently or throw network error |
| **Blocking Features** | Automated email sequences, CRM triggers, workflow executions |

---

## 8. EMAIL (Transactional)

| Field | Value |
|---|---|
| **Service** | Email delivery (Resend / SendGrid / SMTP) |
| **Purpose** | Org member invitations, password reset emails, invoice emails to customers |
| **Required For** | `inviteMember` (org invite token), `forgotPassword` (reset link), autopilot follow-up emails |
| **Environment Variables** | `RESEND_API_KEY` OR `SENDGRID_API_KEY` OR `SMTP_HOST`+`SMTP_PORT`+`SMTP_USER`+`SMTP_PASS` |
| **Configured** | ❌ NOT SET — none of these are in root `.env` |
| **Code Detects Configuration** | ⚠️ PARTIAL — auth service has `// TODO: Send email via EmailService` console.log stubs; email is **not wired to any provider** |
| **Connection Test** | ❌ FAIL — no provider configured AND no email module is wired |
| **Actual Error** | `console.log('[Auth] Password reset token for user@email.com: <uuid>')` — token logged to console, email NOT sent |
| **Blocking Features** | Org invitations (token generated but email not delivered), password reset (link not delivered) |

> [!WARNING]
> This is a **code gap, not just a configuration gap**. Even if SMTP credentials were added, there is no wired email-sending code in the server functions path. The `// TODO` stubs in [`auth.service.ts:L208`](file:///d:/OPTERAOS/optera-os-ai-core/apps/api/src/modules/auth/auth.service.ts#L208) and [`organizations.service.ts:L114`](file:///d:/OPTERAOS/optera-os-ai-core/apps/api/src/modules/organizations/organizations.service.ts#L114) must be implemented.

---

## 9. REDIS

| Field | Value |
|---|---|
| **Service** | Redis (in-memory store) |
| **Purpose** | Rate limiting, session caching, queue management in NestJS API |
| **Required For** | NestJS BullMQ queues, throttle guards (if used) |
| **Environment Variables** | `REDIS_URL` |
| **Configured** | ❌ NOT SET in root `.env` |
| **Code Detects Configuration** | ✅ YES — only required by NestJS (`apps/api/.env.example`) |
| **Connection Test** | ❌ FAIL — NestJS not running |
| **Blocking Features** | Rate limiting on NestJS API (may cause startup crash if BullMQ module is registered) |

---

## 10. APPLE OAUTH

| Field | Value |
|---|---|
| **Service** | Apple Sign-In |
| **Purpose** | "Sign in with Apple" for iOS/web |
| **Required For** | `initiateAppleOAuth` |
| **Environment Variables** | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` |
| **Configured** | ❌ NOT SET |
| **Code Detects Configuration** | ✅ YES — [`auth.functions.ts:L80`](file:///d:/OPTERAOS/optera-os-ai-core/src/lib/auth.functions.ts#L80) checks `APPLE_CLIENT_ID` and returns `{ success: false, error: "Apple OAuth is not configured..." }` — **graceful** |
| **Connection Test** | ❌ BLOCKED — returns error to UI, does not throw |
| **Blocking Features** | Apple Sign-In only |

---

## 11. OPENAI

| Field | Value |
|---|---|
| **Service** | OpenAI API (GPT-4o-mini) |
| **Purpose** | AI fallback when Gemini fails |
| **Required For** | `generateAIResponse` fallback path |
| **Environment Variables** | `OPENAI_API_KEY` |
| **Configured** | ❌ NOT SET |
| **Code Detects Configuration** | ✅ YES — [`ai.service.ts:L519`](file:///d:/OPTERAOS/optera-os-ai-core/src/lib/ai/ai.service.ts#L519) — skips OpenAI if key absent |
| **Connection Test** | ❌ FAIL — not configured |
| **Blocking Features** | None — Gemini is primary; deterministic fallback is tertiary |

---

## ══════════════════════════════════════════════════
## LEADS SPECIFICALLY — "Save & Score Lead" Failure
## ══════════════════════════════════════════════════

### Root Cause Analysis

**ROOT CAUSE: Backend server unavailable — the NestJS REST API (port 3001) is not running.**

This is a **server unavailability failure**, not a code bug, CORS issue, auth issue, or database issue.

---

### Full Request Trace

```
UI: User clicks "Save & Score Lead"
  → createMutation.mutate()
    → leadsApi.create(orgId, draft)
      → apiClient(`/orgs/${orgId}/leads`, { method: 'POST', ... })
        → fetch("http://localhost:3001/api/orgs/{orgId}/leads", { ... })
          → ❌ CONNECTION REFUSED — nothing listening on port 3001
            → fetch throws TypeError: Failed to fetch
              → onError: toast.error("Failed to create lead")
```

---

### Exact Diagnosis

| Dimension | Finding |
|---|---|
| **1. Frontend request URL** | ✅ CORRECT — `http://localhost:3001/api/orgs/{orgId}/leads` |
| **2. Backend server unavailable** | ❌ **ROOT CAUSE** — NestJS API not started, port 3001 is not listening |
| **3. CORS** | ✅ NOT THE ISSUE — request never reaches a server to trigger CORS |
| **4. Authentication** | ✅ NOT THE ISSUE — `Authorization: Bearer <token>` is set correctly by `apiClient` from `localStorage` |
| **5. Organization resolution** | ✅ NOT THE ISSUE — `orgId` is passed as URL param |
| **6. API route mismatch** | ✅ NOT THE ISSUE — `LeadsController` is decorated `@Controller('orgs/:orgId/leads')` which matches |
| **7. Server exception** | ✅ NOT THE ISSUE — server never receives the request |
| **8. Database connection** | ⚠️ SECONDARY — even if NestJS starts, `DATABASE_URL` is not set in `apps/api/.env` |
| **9. Schema mismatch** | ⚠️ TERTIARY — `leads.controller.ts` only has GET/POST/PATCH/DELETE; endpoints like `/qualify`, `/convert`, `/assign`, `/score/recalculate`, `/duplicates/check` are **not implemented** in NestJS |
| **10. Validation** | ✅ NOT THE ISSUE |
| **11. Missing environment variable** | ⚠️ SECONDARY — `apps/api/.env` does not exist |
| **12. Network/proxy** | ✅ NOT THE ISSUE |

---

### REQUIRED FROM USER

1. **Create `apps/api/.env`** from `apps/api/.env.example` with real values:
   ```
   DATABASE_URL=postgresql://...
   JWT_ACCESS_SECRET=<64+ char random string>
   JWT_REFRESH_SECRET=<64+ char random string>
   PORT=3001
   CORS_ORIGIN=http://localhost:5173
   ```

2. **Add to root `.env`**:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Start the NestJS API**:
   ```bash
   cd apps/api
   npm run start:dev
   ```

---

### ALREADY CONFIGURED

| What | Status |
|---|---|
| Supabase URL + Publishable Key | ✅ Set in root `.env` |
| Gemini API Key | ✅ Set in root `.env` |
| Google OAuth credentials | ✅ Set in root `.env` |
| Frontend Vite dev server | ✅ Running (`npm run dev`) |

---

### CODE FIX REQUIRED

The following **endpoints are called by the UI but do not exist** in [`leads.controller.ts`](file:///d:/OPTERAOS/optera-os-ai-core/apps/api/src/modules/leads/leads.controller.ts):

| UI Call | URL | Status |
|---|---|---|
| `leadsApi.qualify()` | `POST /orgs/:orgId/leads/:id/qualify` | ❌ NOT IMPLEMENTED |
| `leadsApi.disqualify()` | `POST /orgs/:orgId/leads/:id/disqualify` | ❌ NOT IMPLEMENTED |
| `leadsApi.convert()` | `POST /orgs/:orgId/leads/:id/convert` | ❌ NOT IMPLEMENTED |
| `leadsApi.assign()` | `POST /orgs/:orgId/leads/:id/assign` | ❌ NOT IMPLEMENTED |
| `leadsApi.recalculateScore()` | `POST /orgs/:orgId/leads/:id/score/recalculate` | ❌ NOT IMPLEMENTED |
| `leadsApi.checkDuplicates()` | `POST /orgs/:orgId/leads/duplicates/check` | ❌ NOT IMPLEMENTED |
| `leadsApi.getPipeline()` | `GET /orgs/:orgId/leads/pipeline` | ✅ IMPLEMENTED |
| `leadsApi.list()` | `GET /orgs/:orgId/leads` | ✅ IMPLEMENTED |
| `leadsApi.create()` | `POST /orgs/:orgId/leads` | ✅ IMPLEMENTED (no scoring) |
| `leadsApi.delete()` | `DELETE /orgs/:orgId/leads/:id` | ✅ IMPLEMENTED |

> [!IMPORTANT]
> Even after starting NestJS, 6 out of 10 lead operations will return **404 Not Found** because those routes don't exist in the controller. The `create` endpoint also does not perform AI scoring — it stores the lead with whatever `score` value is in the DTO.

---

### TEST RESULT

| Test | Result |
|---|---|
| Port 3001 listening | ❌ FAIL — confirmed via `netstat` |
| `leadsApi.create` route exists in NestJS | ✅ PASS (when server is running) |
| Lead scoring on create | ❌ FAIL — `LeadsService.create()` inserts the DTO as-is, no scoring logic |
| qualify/convert/assign routes exist | ❌ FAIL — 404 when server runs |

---

## ACTION CHECKLIST

- [ ] **Create** `apps/api/.env` with `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- [ ] **Add** `SUPABASE_SERVICE_ROLE_KEY` to root `.env`
- [ ] **Start** NestJS: `cd apps/api && npm run start:dev`
- [ ] **Implement** missing leads endpoints: `qualify`, `disqualify`, `convert`, `assign`, `recalculateScore`, `checkDuplicates`
- [ ] **Implement** lead scoring logic in `LeadsService.create()` (multi-factor AI score computation)
- [ ] **Wire** email delivery (Resend/SMTP) for invitations and password reset
- [ ] **Add** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` when payments needed
- [ ] **Verify** Gemini model name `gemini-3.6-flash` — likely should be `gemini-2.0-flash` or `gemini-1.5-flash`
