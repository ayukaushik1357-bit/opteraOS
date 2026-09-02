# opteraOS Automations & Orchestration Layer

This directory contains automation engine contracts, n8n workflow blueprints, and webhook definitions for **opteraOS AUTOPILOT**.

---

## Architectural Principle

> **PostgreSQL is the source of truth for business records.**  
> **n8n is the execution engine for multi-step & external services.**

```
opteraOS Frontend (Visual Canvas / Autopilot)
         │
         ▼
NestJS Backend API (`apps/api` / `backend`)
         │  1. Logs event in `workflows` / `workflow_executions`
         ▼  2. Dispatches payload to n8n Webhook
n8n Engine (`http://localhost:5678`)
         │
         ├──► Executes multi-step actions (Slack, Gmail, WhatsApp, Webhooks)
         │
         └──► Calls back opteraOS REST API to update records & create tasks
```

---

## Standard Event Triggers

- `LEAD_CREATED`: Automated lead scoring & sales representative routing
- `INVOICE_OVERDUE`: Multi-channel payment reminder sequence via WhatsApp/Email
- `STOCK_LOW`: Automatic purchase procurement task generation
- `CUSTOMER_INACTIVE_60D`: Autonomous win-back marketing campaign launch
- `PAYMENT_RECEIVED`: Automated invoice marking & fulfillment dispatch
