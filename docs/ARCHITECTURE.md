# opteraOS Monorepo Architecture

This repository is organized into distinct, modular folders:

```
optera-os-ai-core/
├── backend/                  # NestJS REST API Server (PostgreSQL + Prisma + JWT + AI)
│   ├── src/
│   │   ├── modules/          # 16 distinct domain business modules
│   │   ├── prisma/           # Prisma client service
│   │   └── common/           # RBAC guards & decorators
│   ├── docker-compose.yml    # PostgreSQL, Redis & n8n containers
│   └── package.json
│
├── frontend/                 # React 19 + TanStack Start UI Application
│   ├── src/routes/           # All application pages & public landing page
│   ├── src/components/       # Design system & shared components
│   └── src/lib/api/          # Typed REST API Client SDK
│
├── database/                 # Centralized Database & Schema
│   ├── schema.prisma         # Multi-tenant PostgreSQL database models
│   ├── docker-compose.yml    # Database container definitions
│   ├── seed.ts               # Demo data seeder script
│   └── README.md
│
├── payments/                 # Payments Engine (Razorpay + Stripe)
│   ├── razorpay.service.ts   # Order creation & plan subscriptions
│   ├── webhook.handler.ts    # HMAC-SHA256 signature verification
│   └── README.md
│
├── automations/              # Autonomous Workflows & n8n Orchestration
│   ├── n8n/workflows.json    # Workflow blueprints
│   ├── autopilot/            # Autopilot engine definitions
│   └── README.md
│
└── docs/                     # Architecture & PRD documentation
```
