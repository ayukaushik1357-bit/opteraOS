# opteraOS — Restructured for Independent Deployment

This is opteraOS reorganized into three separately-deployable units, each
with its own README:

```
frontend/    → the actual app (TanStack Start) — deploy to Vercel/Netlify/Cloudflare
backend/     → NestJS REST API — deploy to Railway/Render/Fly/a VM
database/    → Supabase (Postgres) migrations — deploy via Supabase CLI
docs/        → project-wide documentation (architecture, service requirements, status)
```

Each of `frontend/`, `backend/`, and `database/` is meant to be deployed
**independently**, potentially on different hosts/services. Read each
folder's own `README.md` before deploying it — they explain what env vars
it needs and how it relates to the other two.

## Which one do most features actually use?

Almost everything (auth, CRM, leads, deals, tasks, invoices, autopilot,
workflows) is implemented as server functions **inside `frontend/`** that
talk to Supabase (`database/`) directly — it does not go through
`backend/`. The NestJS `backend/` is a separate service with its own
database; only some specific integrations depend on it. If you're only
deploying one thing to get the app working, it's `frontend/` + `database/`.

## What was left out of this restructure, and why

The original project had accumulated some duplicate/stale folders that this
restructure intentionally did not carry forward, so you don't end up
deploying dead code:

- **`apps/web/`** — an older, unused duplicate of the frontend. The
  project's own `vite.config.ts` builds from the root `src/` (now
  `frontend/src/`), not this one.
- **top-level `backend/`** (from the original repo root, not the one now
  moved here) — an orphaned, pre-monorepo copy of the API. The actual
  workspace config (`workspaces: ["apps/*", "packages/*"]`) only recognized
  `apps/api`, which is what's now in `backend/` here.
- **`payments/`** (top-level legacy payment handler class) — superseded by
  `frontend/packages/server/src/payments/`, which is what the live webhook
  route actually calls.
- **`json/project.json`** — scaffolding tool metadata, not part of the app.

If any of these turn out to still matter for your setup, they're still in
your original project — this restructure just didn't assume you wanted them
carried into the clean, three-folder layout.

## Local development (all three at once)

```bash
# Terminal 1 — database: apply migrations to your Supabase project once
cd database && supabase link --project-ref <ref> && supabase db push

# Terminal 2 — backend (only if you need it)
cd backend && npm install && npm run start:dev

# Terminal 3 — frontend
cd frontend && bun install && bun dev
```
