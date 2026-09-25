# opteraOS — Backend (NestJS API)

This is the standalone NestJS REST API (`apps/api` in the original monorepo —
the one actually declared in the workspace config, so it's the canonical
backend service; the old top-level `backend/` folder some earlier tooling
generated was a stale, unused duplicate and was left out of this restructure).

It has its **own** Postgres database via Prisma (`prisma/schema.prisma`) —
separate from `../database` (Supabase), which the frontend uses directly for
almost everything. See `../database/README.md` for why that split exists and
what depends on which database.

## Deploying this independently

Works as a normal Node service on Railway, Render, Fly.io, a VM, or a
container platform of your choice.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, etc.
npx prisma migrate deploy
npm run build
npm run start:prod
```

Set `CORS_ORIGIN` in `.env` to your deployed frontend's URL, and `APP_URL` to
the same, so emails/redirects it generates point at the right place.

## automations/

n8n workflow definitions (`automations/n8n/workflows.json`) that this backend
can trigger or be triggered by. Import them into your own n8n instance and
point `N8N_WEBHOOK_BASE_URL` / `N8N_API_KEY` at it.

## Connecting the frontend to this backend

Most of opteraOS's features talk to Supabase directly from the frontend and
don't need this backend at all. If your deployment does use backend-specific
endpoints (check the frontend's `src/lib/api/` client for what's actually
called), set `VITE_API_URL` in the frontend's `.env` to this service's public
URL plus `/api`, e.g. `https://your-backend.example.com/api`.
