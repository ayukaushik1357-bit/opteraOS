# Product Requirements Document (PRD)
## opteraOS — AI-Powered Business Operating System

**Doc status:** Draft v1
**Product type:** B2B SaaS (AI Business OS / CRM / Automation)
**Primary market:** India + global SMB
**Owner:** opteraOS product team

---

## 1. Summary

opteraOS unifies the tools an SMB normally runs separately — CRM, sales pipeline, tasks, invoicing, inventory, analytics, communication, and automation — into one workspace, with an AI layer that can answer questions about the business and, with approval, take action inside it.

**Problem:** SMBs run on fragmented tools (CRM + spreadsheets + accounting + WhatsApp + task tools + automation platforms). This causes duplicated data, missed follow-ups, poor visibility, and manual busywork. Generic AI assistants can't help because they have no access to the business's private data, permissions, or workflows.

**Solution:** A single multi-tenant platform where business data, workflows, and an AI assistant share the same source of truth, permission model, and audit trail — progressing from *dashboards that inform* to *an AI layer that acts*.

**Vision statement:** Make business operations intelligent, connected, and increasingly autonomous.

**Positioning:**
- Traditional CRM: Store → Track → Report
- opteraOS: Understand → Recommend → Automate → Execute → Learn

---

## 2. Goals

### Primary
1. One central workspace for business operations.
2. A complete CRM foundation (customers, leads, deals, activities).
3. AI assistant that answers questions using the org's authorized data.
4. Visual automation/workflow engine for repetitive operational tasks.
5. Real-time business analytics.
6. Secure multi-tenant, multi-user architecture with roles/permissions.
7. Payments, communication, and external tool integrations.
8. Long-term: AI agents that execute approved business operations.

### Secondary
- Reduce manual data entry and operational complexity.
- Improve sales follow-up and customer retention.
- Make sophisticated automation usable by non-technical owners.

### Non-goals (MVP)
opteraOS is **not** trying to replace, in v1: full accounting/ERP, complete HR, full e-commerce, complete project-management suites, full marketing-automation suites, or enterprise data warehouses. These become future integrations.

The MVP establishes the core spine:
`Organization → Users → CRM → Customers → Deals → Tasks → AI → Automation → Analytics`

---

## 3. Target Users

**Customer profile:** businesses with ~2–100 employees, recurring customer interactions, a sales pipeline, and repetitive operational workflows (agencies, consultancies, SaaS companies, service businesses, distributors, small manufacturers, professional services, real estate, education, B2B, e-commerce).

### Personas

| Persona | Core need | Key question |
|---|---|---|
| Business Owner | Revenue visibility, customer health, AI recommendations | "What should I know and do today?" |
| Sales Manager | Pipeline, team performance, conversion analytics | "Is the team hitting targets?" |
| Sales Employee | Assigned leads, customer history, tasks | "Who do I need to follow up with?" |
| Operations Manager | Workflows, automation, process health | "What's broken or overdue?" |
| Administrator | Org, users, roles, billing, security | "Is the org configured correctly?" |

---

## 4. System Architecture

Six layers:

1. **Identity & Organization** — auth, orgs, memberships, invitations, roles, permissions, tenant isolation.
2. **Business Data** — Supabase PostgreSQL; source of truth for all core entities.
3. **Application Backend** — auth/authz, business logic, API, validation, AI orchestration, webhook/integration handling.
4. **Automation** — n8n as the external orchestration layer for multi-step/external workflows; opteraOS remains source of truth for data.
5. **AI** — conversational assistant, controlled tool system, business-data Q&A, recommendations, (future) RAG and agents.
6. **Frontend** — React + TanStack Start + Tailwind CSS, responsive dashboard.

```
        ┌────────────┐
        │  Frontend  │  React / TanStack Start / Tailwind
        └─────┬──────┘
              │ API (REST/tRPC)
        ┌─────▼──────┐        ┌────────────┐
        │  Backend   │◄──────►│     AI     │  conversation, tool system, safety
        │ (business  │        └─────┬──────┘
        │  logic,    │              │
        │  authz)    │        ┌─────▼──────┐
        └─────┬──────┘        │    RAG     │  embeddings, retrieval, vector store
              │                └────────────┘
        ┌─────▼──────┐
        │  Supabase  │  Postgres + RLS + Auth
        └─────┬──────┘
              │ events/webhooks
        ┌─────▼──────┐
        │    n8n     │  external workflow orchestration
        └────────────┘
```

---

## 5. Core Modules & Requirements

### 5.1 Auth & Organizations
- Register / log in / log out / reset password / verify email.
- Create organization, invite members, accept invitations, switch orgs.
- Strict tenant isolation — no org can read another org's data, including via ID manipulation (enforced by Supabase RLS + server-side authorization).

### 5.2 Roles & Permissions
Initial roles: **Owner, Admin, Manager, Employee** (custom/granular roles are a future capability).
Example permission scopes: `customers.read/create/update/delete`, `deals.read/update`, `invoices.read/create`, `automation.manage`, `ai.use`, `analytics.view`, `organization.manage`.

### 5.3 Dashboard
Widgets: Revenue (total/trend/MoM), Sales (leads/deals/win-rate), Customers (total/new/active/inactive), Tasks (due/overdue/completed), Invoices (paid/unpaid/overdue), AI Insights (natural-language callouts), Activity Feed (recent org-wide events).

### 5.4 CRM
- **Customers** — profile, contacts, deals, activities, tasks, invoices, notes, AI summary.
- **Leads** — source, status (New/Contacted/Qualified/Unqualified/Converted/Lost), score, owner; AI to eventually compute score, conversion probability, next action.
- **Deals** — pipeline, stage (New/Qualified/Proposal/Negotiation/Won/Lost — customizable), value, probability, close date. Kanban + list views with drag-to-stage.
- **Activities** — calls, meetings, emails, notes, follow-ups, status changes, shown as a chronological timeline per customer/deal.

### 5.5 Tasks
Fields: title, description, assignee, priority (Low/Medium/High/Urgent), due date, status (Todo/In Progress/Completed/Cancelled), linked customer/deal. Future: AI-recommended prioritization.

### 5.6 AI Assistant
- Conversations scoped to org + user, with history, rename, delete, streaming, retry, error handling.
- Answers business questions from authorized org data ("Which deals are at risk?", "Summarize this customer.").
- **Controlled tool system** rather than raw DB access:
  - Read tools: `get_customer`, `search_customers`, `get_deal`, `search_deals`, `get_tasks`, `get_revenue`, `get_invoice`.
  - Action tools: `create_customer`, `update_customer`, `create_deal`, `update_deal`, `create_task`, `complete_task`, `create_note`.
  - Every tool call verifies: authentication → org membership → permission → input validation → org ownership of the target record.
- **Safety model** — actions classified as Read (no confirmation), Low-risk write (executes if permitted), High-risk write (requires explicit user confirmation via an action card, e.g. sending external messages, deletions, financial operations, permission changes, bulk actions).
- Future: RAG over uploaded documents/SOPs/policies (`document → extraction → chunking → embeddings → vector store → retrieval → response`), and autonomous agents.

### 5.7 Automation
- Model: `Trigger → Conditions → Actions`.
- Example triggers: customer/lead/deal created, deal stage changed, invoice created/overdue, task overdue, payment received, form submitted, webhook received, scheduled time, low stock.
- Example actions: create/update CRM records, send email/notification, call webhook, run an n8n workflow, run AI analysis, generate report.
- **n8n** is the external orchestration engine for multi-step/external workflows; opteraOS stores workflow metadata and execution status and remains the system of record for business data.
- Every execution logged: workflow ID, execution ID, trigger, start/end time, status (Running/Successful/Failed/Cancelled), nodes executed, errors, output.
- Future: visual node-based workflow builder.

### 5.8 Invoicing & Payments (Phase 2)
- Invoices: number, customer, line items, subtotal, tax, discount, total, due date, status (Draft/Sent/Paid/Partially Paid/Overdue/Cancelled).
- **Razorpay** for payments — kept conceptually and technically separate: (a) SaaS billing (customer pays opteraOS) vs. (b) business payments (an opteraOS customer collecting from their own customers).

### 5.9 Inventory (Phase 3)
Products/SKUs, stock quantity, low-stock threshold, stock movements, suppliers, warehouses. Example automation: `stock < threshold → alert → notify owner → purchase task`.

### 5.10 Analytics
Sales (leads, conversion, pipeline value, win rate, avg deal size, cycle length), Customer (growth, retention, activity, value), Revenue (monthly, growth, outstanding), Team (tasks, deals, performance), Automation (executions, success/failure rate, time saved).

### 5.11 Notifications
Types: task assigned/overdue, new lead, deal update, invoice overdue, automation failure, AI action required, system alert. Channels: in-app first, then email, then WhatsApp/SMS.

### 5.12 Integrations & API
- Communication: Gmail, Outlook, WhatsApp, Slack.
- Payments: Razorpay (India), Stripe (future/global).
- Automation: n8n.
- Productivity: Google/Microsoft Calendar.
- Data: CSV import/export, public API, webhooks.
- Webhook events: `customer.created/updated`, `lead.created`, `deal.created/updated/won`, `invoice.created/paid`, `task.completed`, `workflow.completed` — each with event type, org ID, object ID, timestamp, data, event ID.

### 5.13 Multi-Tenancy & Security
- `User → Organization Membership → Organization → Business Data`; every tenant-owned table carries an `organization_id`.
- Supabase Row Level Security enforces isolation; AI tools use the **same** authorization model as normal application actions — no privileged bypass.
- Also required: server-side authorization, input/API validation, secure secrets, audit logging, rate limiting, secure webhooks, least-privilege integrations.

### 5.14 Audit Logs
Logged: login, org/permission changes, customer create/delete, deal changes, invoice actions, AI actions, automation changes, integration changes. Record shape: user, organization, action, resource, timestamp, metadata.

---

## 6. Data Model (Core Entities — MVP)

`organizations`, `organization_members`, `invitations`, `customers`, `leads`, `deals`, `tasks`, `conversations`, `messages`, `workflows`, `workflow_executions`, `audit_logs` — see architecture doc / `packages/shared` for full field-level schema. All tenant-scoped tables carry `organization_id`; all mutate-capable tables carry `created_at`/owner or assignee references for audit and permission checks.

---

## 7. UX Requirements

- **Navigation:** Dashboard · AI Assistant · CRM (Customers/Contacts/Leads/Deals/Activities) · Tasks · Automation · Analytics · Invoices · Inventory · Integrations · Settings.
- **AI page:** conversation sidebar, message area, composer (attach/send/stop/retry), and **AI action cards** that make clear when the AI is answering vs. proposing an operation ("AI wants to create 5 tasks. Approve?").
- **Empty states:** helpful, not blank — e.g. "No customers yet" + Add Customer / Import Customers.
- **Errors:** human-readable ("We couldn't create this customer. Please try again."), never raw stack traces; developer detail logged separately, not shown.
- **Performance:** fast initial dashboard load, paginated tables, lazy loading for heavy modules, streaming AI responses, caching, background jobs for long-running work — large datasets are never loaded whole into the browser.
- **Design principles:** clean, professional, fast, minimal clutter, clear hierarchy, accessible, desktop-first with responsive support, consistent opteraOS visual identity (gradient-based professional aesthetic).

---

## 8. Roadmap

### Phase 1 — MVP (current focus)
Auth/orgs/roles/RLS · CRM (customers/leads/deals/activities) · Tasks/notifications · Dashboard · AI conversation + controlled tools · basic automation (triggers/actions) + n8n foundation.

**Immediate priority:** stabilize the AI Conversation / New Chat flow end-to-end —
`New Chat → Conversation Creation → Conversation ID → UI State → Message → AI Response → Persistent History`
— before starting on advanced agents, complex automation, inventory, or payments.

### Phase 2
Advanced AI tools · RAG + document upload · advanced analytics · email/calendar integration · invoicing · Razorpay · visual workflow builder + templates.

### Phase 3
WhatsApp integration · advanced inventory · AI sales agent · AI customer-support agent · advanced BI · autonomous workflow execution · custom AI agents · integration marketplace · public API.

### Suggested build order
Auth → Multi-tenancy → DB/RLS → CRM → Tasks → Dashboard → AI conversation → AI tools → Automation → n8n integration → Invoicing → Payments → Advanced RAG → AI agents.

---

## 9. MVP Acceptance Criteria

**Auth/Security**
- Users can register/login/logout; orgs can be created; invitations work; roles work.
- RLS prevents cross-tenant access; unauthorized actions are rejected server-side (not just hidden in UI).

**CRM/Tasks/Dashboard**
- Customers/leads/deals support create/read/update; pipeline stage changes work.
- Tasks can be created, assigned, and completed.
- Dashboard metrics reflect real org data.

**AI**
- User can start a new conversation and send a message; a response streams back; history persists.
- AI can retrieve authorized business data and **cannot** access another org's data.
- Failed requests expose retry/error states, not a broken UI.

**Automation**
- A workflow can be created, its trigger can fire, its action executes, and execution status is recorded.

---

## 10. Success Metrics

**Product:** registered/activated/weekly-active/monthly-active orgs, users per org, CRM records created, AI conversations, AI actions executed, workflows created/executed, automation success rate.

**Business:** free→paid conversion, MRR/ARR, churn, CAC, LTV, average revenue per org.

**Value (headline metric):** estimated operational time saved through automation.

---

## 11. Business Model (indicative)

| Tier | For | Includes |
|---|---|---|
| Free/Trial | Individuals, very small teams | Capped users/customers/AI messages/workflows/storage |
| Starter | Small businesses | CRM, tasks, dashboard, basic AI, basic automation |
| Growth | Growing teams | Advanced AI + automation, integrations, analytics, team features |
| Business | Larger orgs | Advanced permissions, higher AI limits, advanced workflows, priority support, enterprise integrations |

Pricing to be validated against market willingness-to-pay, not derived purely from infra cost.

---

## 12. Open Questions
- Exact RAG vector-store choice (pgvector on Supabase vs. dedicated vector DB) once document volume/latency needs are clearer.
- Scope of "custom roles" — full RBAC builder vs. a fixed set of extra roles in v1.
- Whether n8n is self-hosted or managed, and how workflow ownership/versioning is exposed to end users.
- WhatsApp/email provider selection and deliverability/compliance requirements for the Indian market.
