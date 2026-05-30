# newproject — context for future Claude sessions

## What this is

A generic multi-tenant application **skeleton**, forked from a cultivation-OS stack
and stripped to a baseline. It ships auth, multi-org, audit, health, admin/users,
and a minimal settings page — and nothing domain-specific. Build features on top.

- Local: app on <http://localhost:3004>, Postgres on `localhost:5435`
- Dev sign-in: `dev@newproject.local` / `devpassword`

## Stack

- **Next.js 16** (App Router, Turbopack). Note Next 16 breaking changes: async
  `params`, and `middleware` is renamed to the `proxy` file convention
  (`src/proxy.ts`).
- **TypeScript** everywhere, `strict: true`.
- **Postgres + Prisma 6** (`prisma-client-js` legacy generator).
- **Auth.js v5** (`5.0.0-beta.31`) with the edge-safe split:
  - `src/auth.config.ts` — config used by `src/proxy.ts` (no Prisma)
  - `src/auth.ts` — full config: Prisma adapter, Credentials (bcryptjs), Google (env-gated)
  - JWT session strategy
- **UI**: Tailwind v4 + shadcn-style primitives in `src/components/ui/`. Dark mode via `.dark` on `<html>`.
- **State**: RSC + Server Actions. `nuqs` for URL search-state.
- **Forms**: react-hook-form + zod (schemas double as Server Action validators).
- **i18n**: `next-intl`, EN/ID, cookie-based locale (no URL prefix). Messages in `src/i18n/messages/{en,id}.json`.
- **Tests**: Vitest.

## Multi-tenancy

- `Organization` + `OrganizationMembership`. The active org is held in the
  `activeOrgId` cookie.
- **Auto-scoping via Prisma `$extends`** in `src/lib/prisma.ts`: reads `activeOrgId`
  from the request cookie and injects `where:{organizationId}` on reads/updates and
  `data:{organizationId}` on creates for every model in `ORG_SCOPED_MODELS` (currently
  just `AuditAction` — add your tenant models here as you build them).
- `organizationId` is `String?` in the Prisma schema (so creates typecheck without it)
  — when you add tenant tables, make it `NOT NULL` in the DB via migration so a missing
  scope fails safely rather than writing an orphan row.
- Non-request contexts (seed, CLI) skip scoping and must stamp `organizationId` explicitly.
- Active-org plumbing: `src/server/org.ts` (`listMyOrgs`, `getActiveOrgId`,
  `requireActiveOrgId`), `src/server/org-actions.ts` (`setActiveOrg`),
  `src/components/shared/org-switcher.tsx`.

## Auth flow

1. Unauthenticated user hits any `/(app)/*` route.
2. `src/proxy.ts` checks `req.auth`, redirects to `/signin?callbackUrl=…`.
3. Sign-in posts to `/api/auth/callback/credentials`; the Credentials `authorize`
   looks up the user, compares the bcryptjs hash, returns `{ id, email, name, role }`.
4. JWT session cookie set.
5. Google provider is added only when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set.

- **Two-tier auth**: `User.role` is `USER` or `SUPERUSER`. Only SUPERUSER sees
  `/admin/users` and the "Users" sidebar entry. The seeded dev user is a SUPERUSER.

## Audit

Generic log: `AuditAction { type, entityType, entityId, payload (Json), undone }`
via `src/server/audit.ts`. `src/server/audit-handlers.ts` is a (currently empty) undo
registry — register per-type undo handlers there as you add features.

## Gotchas

1. **Always run `npx tsc --noEmit` before committing.** The legacy Prisma generator
   types `PrismaClient` loosely, so some type errors only surface in the Railway build.
   This is the single most common deploy-breaker.
2. **Dropdowns inside dialogs**: `SelectContent` uses `z-[100]` (above `Dialog`'s
   `z-50`). Give new portal-opening primitives `z-[100]` or they hide behind the dialog.
3. **Railway prod env vars** must be set in the dashboard (Project → web → Variables).
   The CLI/GraphQL `variables --set` path may be blocked.
4. **Lockfile drift after adding deps**: run `npm install --package-lock-only` so
   Railway's strict `npm ci` doesn't reject with "Missing X from lock file".
5. **CRLF warnings on commit are normal** (Windows checkout, LF repo).
6. **Global `Cache-Control: no-store`** is set in `next.config.mjs` for everything
   except `/_next/static/*`, so deploys are visible without a hard refresh.

## Deployment (Railway)

- Services: `web` (Dockerfile build) + `Postgres` plugin; Volume at `/data`, `UPLOAD_DIR=/data/uploads`.
- Builder `DOCKERFILE`; start `npm run start:prod` (`prisma migrate deploy && seed && next start`); healthcheck `GET /api/health`.
- Container runs as **root** so it can write the Volume mount — do not re-add `USER nextjs`.
- Required env: `DATABASE_URL=${{ Postgres.DATABASE_URL }}`, `AUTH_SECRET`,
  `AUTH_URL`, `AUTH_TRUST_HOST=true`, `UPLOAD_DIR=/data/uploads`. Optional:
  `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.

## Commands

```bash
npm run dev            # next dev -p 3004
npm run build          # prisma generate && next build
npm run start:prod     # migrate deploy && seed && next start  (Railway)
npm run typecheck      # tsc --noEmit  ← run before every commit
npm run lint           # eslint
npm test               # vitest run
npm run prisma:migrate # prisma migrate dev
npm run prisma:studio  # prisma studio (5555)
npm run db:seed        # idempotent seed
```

---

@AGENTS.md
