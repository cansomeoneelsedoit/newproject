# newproject

A multi-tenant full-stack application skeleton — Next.js 16 + Postgres + Prisma + Auth.js.
Forked from the cultivation-OS stack and stripped to a generic baseline (auth,
multi-org, audit, health, admin/users, settings).

- **Frontend & API**: Next.js 16 (App Router, Turbopack) + TypeScript (`strict`)
- **Database**: Postgres 16 + Prisma ORM
- **Auth**: Auth.js (NextAuth v5), JWT sessions, credentials + optional Google
- **Multi-tenant**: `Organization` + `OrganizationMembership`, cookie-based active org, auto-scoped via a Prisma client extension
- **Tests**: Vitest
- **Dev environment**: Docker Compose
- **Deploy target**: Railway (auto-deploy from `main`)

Local ports: **app `3004`**, **Postgres `5435`** (host-side).

## Local development (Docker Compose — recommended)

```bash
cp .env.example .env          # only needed once
docker compose up --build     # first run: builds, migrates, seeds, starts dev
docker compose up -d          # subsequent runs
```

- App: <http://localhost:3004>
- Postgres: `localhost:5435` (user `newproject` / pass `newproject` / db `newproject`)
- Dev sign-in: `dev@newproject.local` / `devpassword`

```bash
docker compose exec web npm test                       # vitest
docker compose exec web npx prisma studio              # DB GUI on :5555
docker compose exec web npx prisma migrate dev --name <change>
docker compose exec db psql -U newproject -d newproject
```

## Without Docker (host Node + your own Postgres)

```bash
npm ci
cp .env.example .env          # point DATABASE_URL at your Postgres on :5435
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev                   # http://localhost:3004 (script already binds -p 3004)
```

## Useful endpoints

- `GET /api/health` — liveness + DB ping (Railway healthcheck)
- `POST /api/auth/*` — Auth.js handlers
- `GET /api/uploads/[...path]` — authenticated file serving

## Deployment (Railway)

Connect the repo to a Railway project (auto-deploy on `main`), add the **Postgres**
plugin and a **Volume** at `/data`, then set env vars in the dashboard. See
[SETUP.md](SETUP.md) §Railway for the full checklist. Build/start/healthcheck are
defined in [railway.json](railway.json).

## Project layout

```
prisma/
  schema.prisma      Auth.js + Organization/Membership + Setting + AuditAction
  seed.ts            idempotent: one org + one dev superuser
src/
  app/
    (auth)/signin/   sign-in page
    (app)/           authenticated shell (sidebar + topbar)
      page.tsx       dashboard (skeleton landing)
      admin/users/   superuser user management
      settings/      general settings
      audit/         audit undo action
    api/{auth,health,uploads}/
  components/{ui,shared}/
  server/            org, audit, uploads, prisma helpers (server-only)
  lib/prisma.ts      Prisma singleton + org auto-scoping extension
  auth.ts / auth.config.ts / proxy.ts
docker-compose.yml · Dockerfile · Dockerfile.dev · railway.json · .github/workflows/ci.yml
```

See [CLAUDE.md](CLAUDE.md) for architecture notes and gotchas.
