# opteraOS Frontend Application

The frontend client for **opteraOS** is built with **React 19**, **TanStack Start / TanStack Router**, **Tailwind CSS**, and **shadcn/ui**.

---

## Directory Structure

```
frontend/ (and root src/)
├── src/
│   ├── routes/
│   │   ├── _authenticated/
│   │   │   ├── dashboard.tsx       # Business Overview Dashboard
│   │   │   ├── ai.tsx              # optera AI Interactive Workspace
│   │   │   ├── analytics.tsx       # Revenue, Customers, Pipeline Analytics
│   │   │   ├── crm.tsx             # CRM Hub
│   │   │   ├── leads.tsx           # Lead Management Pipeline
│   │   │   ├── customers.tsx       # Customer 360 Profiles
│   │   │   ├── deals.tsx           # Sales Pipeline & Deals
│   │   │   ├── orders.tsx          # Order Lifecycle & Line Items
│   │   │   ├── invoices.tsx        # GST Invoices & Payment Status
│   │   │   ├── inventory.tsx       # Products & Stock Movements
│   │   │   ├── tasks.tsx           # Task Assignment & Priority
│   │   │   ├── marketing.tsx       # Broadcast Campaigns (Email/WhatsApp)
│   │   │   ├── workflows/          # Visual Workflow DAG Canvas
│   │   │   ├── team.tsx            # Team & Department Management
│   │   │   ├── integrations.tsx    # Integrations Marketplace
│   │   │   ├── knowledge.tsx       # RAG Knowledge Base
│   │   │   ├── notifications.tsx   # Real-time Event Alerts
│   │   │   └── settings.tsx        # Org, Billing, & Security Settings
│   │   ├── index.tsx               # High-Converting SaaS Landing Page
│   │   ├── pricing.tsx             # Public Pricing Page with Razorpay
│   │   └── auth.tsx                # JWT Sign In, Sign Up, & Password Recovery
│   ├── components/
│   │   ├── app/                    # AppShell, Navigation, Drawers, Notifications
│   │   ├── brand/                  # opteraOS Logo & Brand Gradient Lockup
│   │   ├── marketing/              # Landing Page Visuals & Product Previews
│   │   └── ui/                     # Accessible Radix UI / shadcn Components
│   └── lib/
│       └── api/                    # Typed REST API Client SDK
```

---

## Development Scripts

```bash
# Run local dev server (port 5173)
npm run dev

# Run strict TypeScript check
npm run typecheck

# Build production bundle
npm run build
```
