# newproject — Setup Guide

Multi-tenant **Next.js 16 + Postgres + Prisma + Auth.js** skeleton, deployed on Railway.

- **Live:** https://newproject.up.railway.app _(once Railway is provisioned)_
- **Repo:** https://github.com/cansomeoneelsedoit/newproject
- **Canonical local path:** `C:\Users\boyds\Desktop\newproject`
- **Dev sign-in:** `dev@newproject.local` / `devpassword`
- **Local ports:** app **3004**, Postgres **5435** (host-side)

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22.x+ | Docker base image is `node:22-alpine` |
| npm | 10+ | Repo uses `npm ci` (strict lockfile) |
| Docker + Compose | latest | Recommended local path (Postgres + app) |
| Git | any | Repo is LF; CRLF warnings on Windows are normal |

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router + Turbopack) |
| UI | React 19, Tailwind v4 + shadcn/Radix primitives |
| Language | TypeScript (`strict`) |
| Database | Postgres 16 |
| ORM | Prisma 6 (`prisma-client-js`) |
| Auth | Auth.js / NextAuth v5 (JWT) — credentials + optional Google |
| Multi-tenant | `Organization` + `OrganizationMembership`, cookie active-org, Prisma `$extends` auto-scoping |
| i18n | next-intl (EN/ID, cookie locale) |
| Forms | react-hook-form + zod |
| Tests | Vitest |

## 3. Local development (Docker Compose — recommended)

```bash
git clone https://github.com/cansomeoneelsedoit/newproject.git
cd newproject
cp .env.example .env
docker compose up --build      # builds, migrates, seeds, starts dev
docker compose up -d           # subsequent runs
```

- App: <http://localhost:3004> · Postgres: `localhost:5435` (`newproject`/`newproject`/`newproject`)
- The web container boots with `prisma migrate deploy && seed && next dev`.

```bash
docker compose exec web npm test
docker compose exec web npx prisma studio        # :5555
docker compose exec web npx prisma migrate dev --name <change>
docker compose exec db psql -U newproject -d newproject
```

## 4. Local development (host Node, no Docker)

```bash
npm ci
cp .env.example .env            # DATABASE_URL → your local Postgres on :5435
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev                     # http://localhost:3004 (script binds -p 3004)
```

## 5. Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres URL. Local: `postgresql://newproject:newproject@localhost:5435/newproject?schema=public`. Prod: Railway Postgres plugin. |
| `DATABASE_SSL` | — | `false` locally; Railway Postgres uses SSL automatically. |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32`. |
| `AUTH_URL` | ✅ | Dev `http://localhost:3004`; prod the Railway domain. |
| `AUTH_TRUST_HOST` | ✅ (prod) | `true` — required behind Railway's proxy. |
| `UPLOAD_DIR` | ✅ (prod) | Dev `./uploads`; prod `/data/uploads` (Railway Volume). |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | optional | The SDKs ship with the stack for AI features you add. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Enables Google sign-in. Redirect: `http://localhost:3004/api/auth/callback/google`. |

## 6. Database & seed

- Schema: `prisma/schema.prisma` — Auth.js tables + `Organization`/`OrganizationMembership` + `Setting` + `AuditAction`.
- Seed: `prisma/seed.ts` — **idempotent**; creates one org (`newproject`) + one superuser `dev@newproject.local` / `devpassword`.
- On first setup the init migration is created with a live DB: `npx prisma migrate dev --name init`.

## 7. npm scripts

```bash
npm run dev            # next dev -p 3004
npm run build          # prisma generate && next build
npm run start:prod     # prisma migrate deploy && seed && next start   (Railway)
npm run typecheck      # tsc --noEmit   ← run before every commit
npm run lint           # eslint
npm test               # vitest run
npm run prisma:migrate # prisma migrate dev
npm run prisma:studio  # prisma studio (5555)
npm run db:seed        # idempotent seed
```

## 8. Deployment (Railway)

1. Railway dashboard → New Project → Deploy from GitHub repo `newproject` (enables auto-deploy on `main`).
2. New → Database → **PostgreSQL** (provides `${{ Postgres.DATABASE_URL }}`).
3. web service → Volumes → New Volume, mount path `/data`.
4. Builder = `DOCKERFILE` (already set in `railway.json`); start `npm run start:prod`; healthcheck `/api/health`.
5. Set env vars (dashboard → web → Variables):
   ```
   DATABASE_URL        = ${{ Postgres.DATABASE_URL }}
   AUTH_SECRET         = <openssl rand -base64 32>
   AUTH_URL            = https://newproject.up.railway.app
   AUTH_TRUST_HOST     = true
   UPLOAD_DIR          = /data/uploads
   ```
6. Push to `main` → auto-deploys. Verify `GET /api/health` → 200.

> Prod env vars must be set in the **dashboard** — the CLI/GraphQL `variables --set`
> path may be blocked. The container runs as **root** so it can write the Volume
> mount; do not re-add `USER nextjs`.

## 9. Verifying a healthy setup

```bash
curl http://localhost:3004/api/health     # → 200
npm run typecheck                          # → no errors
npm test                                   # → all pass
```

Then sign in at <http://localhost:3004> with `dev@newproject.local` / `devpassword`.
