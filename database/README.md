# opteraOS — Database

This is the **live, real database** for opteraOS: a Supabase (Postgres) project.
Every table, RLS policy, and function the running app actually uses lives in
`supabase/migrations/`, in order.

## Deploying this independently

1. Create a project at [supabase.com](https://supabase.com) (or self-host Supabase).
2. Install the Supabase CLI: `npm i -g supabase`
3. Link it to your project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
4. Push every migration in order:
   ```bash
   supabase db push
   ```
5. Copy the resulting Project URL, anon/publishable key, and service role key
   into `../frontend/.env` (see that folder's `.env.example`).

## Why RLS matters here

Every table under `public` has Row Level Security policies scoping data by
`org_id` and the caller's membership/role in `organization_members`. The
frontend's server functions rely on these policies as the actual security
boundary (they run with the calling user's session, not a service-role
bypass) — don't disable RLS on any table here without understanding what
depends on it.

## About `docker-compose.yml`

Included for local development only (spins up a local Postgres you can point
Supabase CLI at, or use directly). It duplicates none of the migrations —
you still need to apply `supabase/migrations/` against it.

## A note on the separate backend's database

`../backend` (the NestJS API) uses its **own, separate** Postgres database via
Prisma (`../backend/prisma/schema.prisma`) — it is not the same database as
this one, and the two are not synchronized. This split existed in the
original codebase; most of the app (auth, CRM, tasks, invoices, autopilot,
workflows) reads and writes here, in Supabase, directly. Only treat the
backend's Prisma database as a second source of truth if you have
deliberately wired a specific feature to call the backend API instead of
Supabase directly — check that feature's code before assuming otherwise.
