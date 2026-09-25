# opteraOS — Frontend

This is the real, live opteraOS application: a TanStack Start app (React +
Vite + Nitro). It's the thing users actually open in a browser, and it
also contains its own server-side code — server functions in `src/lib/*`
that query Supabase directly, and Nitro API routes in `server/routes/api/`
(currently just the Razorpay webhook receiver).

That's normal for this kind of full-stack framework: "frontend" here means
"the deployable that serves the app," not "browser code only." You do not
need the separate `../backend` (NestJS) service for most features — check
`src/lib/api/` if you're unsure whether a specific page depends on it.

## packages/

Local workspace packages this app imports via `@optera/*` aliases (see
`tsconfig.json`):
- `packages/ui` — shared UI components
- `packages/types` — shared TypeScript types
- `packages/validation` — shared zod schemas
- `packages/server` — server-side payment (Razorpay) and OAuth logic used by
  `server/routes/api/razorpay-webhook.ts` and the auth flow

## Deploying this independently

Works on Vercel, Netlify, Cloudflare Pages, or any Node host that supports
Nitro's output.

```bash
bun install          # or npm install
cp .env.example .env # fill in Supabase + AI + email + payment keys
bun run build
bun run preview       # or deploy the build output to your host
```

Point it at your database by filling in the `SUPABASE_*` / `VITE_SUPABASE_*`
variables from `../database` (see that folder's README for how to stand up
the Supabase project those values come from).

## Local development

```bash
bun install
bun dev
```

Runs at `http://localhost:5173` by default.
