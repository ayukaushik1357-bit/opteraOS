# opteraOS Database Layer

This directory contains the database schema, Prisma ORM models, migrations, seed scripts, and Docker Compose configurations for **opteraOS**.

---

## Architecture Overview

- **Primary Database:** PostgreSQL 16 (Relational, ACID, Multi-Tenant Isolation)
- **ORM:** Prisma ORM 5
- **Caching & Rate Limiting:** Redis 7
- **Tenant Isolation:** Every tenant table carries `organizationId` foreign key with cascade deletion.

---

## Database Entities

| Entity | Description |
|---|---|
| `User` | Authenticated users with email verification, password hash, and avatars |
| `Organization` | Multi-tenant organization boundaries and currency settings |
| `OrganizationMember` | Tenant memberships with RBAC roles (`OWNER`, `ADMIN`, `MANAGER`, `EMPLOYEE`, `VIEWER`) |
| `Invitation` | Token-based team invitations with expiry |
| `Customer` | CRM customer profiles, lifetime value, and communication records |
| `Lead` | Sales leads with score, stages (`NEW` → `QUALIFIED` → `CONVERTED`), and source |
| `Deal` | Deals pipeline, probabilities, expected close dates, and values |
| `Product` & `InventoryMovement` | Product catalog, SKU, stock count, and audit trails |
| `Order` & `OrderItem` | Customer orders, item line prices, status |
| `Invoice` & `InvoiceItem` | GST/tax invoices, line items, payment status, PDF generation |
| `Payment` | Razorpay transactions, HMAC signatures, paid timestamps |
| `Subscription` | SaaS billing subscription plans (`STARTER`, `GROWTH`, `BUSINESS`) |
| `Workflow` & `WorkflowExecution` | Visual automation DAG nodes, edges, n8n IDs, execution logs |
| `AIConversation` & `AIMessage` | Chat history, prompt logs, and tool execution outputs |
| `Task` & `Activity` | Organizational tasks, priorities, timeline activities |
| `Campaign` | Marketing broadcast campaigns (Email, WhatsApp, SMS) |
| `Integration` | Configured third-party service connections (Razorpay, n8n, Slack, Gmail, etc.) |
| `AuditLog` | Security & compliance audit trail per organization |

---

## Quick Start (Docker)

```bash
# 1. Start PostgreSQL & Redis
docker compose up -d

# 2. Push Prisma schema to PostgreSQL
npx prisma db push --schema=./schema.prisma

# 3. Seed demo data
npx ts-node seed.ts
```
