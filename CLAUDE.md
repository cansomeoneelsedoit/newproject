# Kronos — context for future Claude sessions

## What this is

**Kronos**, an AI-assisted trading platform: market data → strategy signals →
backtesting → portfolio & paper trading, with a written analysis layer on top.

It is built on a generic multi-tenant skeleton (forked from a cultivation-OS
stack) that still supplies auth, multi-org, audit, health, admin/users and
settings; the trading domain sits on top.

- Local: app on <http://localhost:3004>, Postgres on `localhost:5435`
- Dev sign-in: `dev@kronos.local` / `devpassword`

## The domain

`Instrument` → `Candle`, and `Strategy`; together they produce `Signal`s and
`Backtest`s. Paper trading uses `Account_` → `Position` / `Order_`. Written
reads are stored as `AiAnalysis`.

**The quant core is pure and heavily tested** — no Prisma, no React, so it
unit-tests directly (91 tests in `src/lib/*.test.ts`):

- `src/lib/indicators.ts` — SMA, EMA, RSI, ATR, MACD, Bollinger, Donchian.
  Every function returns an array **the same length as its input**, with `null`
  through the warm-up. That alignment is what lets the backtester index candles
  and indicators with the same `i`; a "skip the first N" convention is the
  classic source of off-by-one lookahead bugs.
- `src/lib/strategies.ts` — each strategy maps candles to a *target position*
  per bar (`1` / `0` / `-1`) plus a reason. Hard rule: **the target for bar `i`
  may only use bars `0..i`.**
- `src/lib/backtest.ts` — executes bar `i`'s target at **bar `i+1`'s open**,
  with slippage against the trader and commission per side. `backtest.test.ts`
  contains an explicit no-lookahead guard: appending future bars must not change
  any earlier equity value.
- `src/lib/metrics.ts` — CAGR, max drawdown, Sharpe, Sortino, profit factor.
  Note `profitFactor()` returns `Infinity` with no losses; persist via
  `finiteProfitFactor()` because Postgres has no representation for it.
- `src/lib/portfolio.ts` — average-cost position accounting. The most
  correctness-critical file here: both the backtester and the live paper-trading
  path run every fill through `applyFill`. Handles partial closes and flips
  through zero (close, then re-open the excess at the fill price).

## Validation — the part that matters

A backtest that only reports its in-sample return is a sales pitch. `runBacktest`
(`src/server/kronos-actions.ts`) runs **three gates** via `src/lib/validation.ts`
and persists all of them:

1. **In-sample acceptance** — `checkAcceptance()` against `DEFAULT_RULES`
   (≥30 trades, profit factor 1.3–4, max DD ≥ −35%, Sharpe ≥ 0.8, win rate ≤ 90%).
   The *upper* bounds are not a typo: a profit factor of 8 or a 95% win rate is
   evidence of a bug or a lookahead leak, not of an edge.
2. **Walk-forward** — 5 windows over the in-sample slice. Needs 60%+ of windows
   profitable and no window worse than −40% drawdown.
3. **Out-of-sample** — the final `DEFAULT_OOS_FRACTION` (30%) of bars, never
   touched by steps 1–2.

**The invariant, and the reason this file exists:** walk-forward windows are cut
from the *in-sample slice only*. `splitSample()` first, `walkForwardRanges()`
second, on the shorter array. Tiling windows across the full series lets the
holdout leak into tuning, which is the exact bug this layer was ported to fix —
`validation.test.ts` has a regression test that asserts every window end index is
`<= splitIndex`.

`Backtest.from`/`to` describe the **in-sample** window; the holdout is
`oosFrom`/`oosTo`. The UI shows both side by side and flags decay over 20 points,
because a strategy that goes +36% in-sample and −7% out-of-sample is the whole
failure mode in one row.

## TradingView

Validate here, alert there, fill back here.

- `src/lib/pine.ts` — pure Pine v5 generator, one template per strategy kind.
  Entries carry `alert_message=kronosPayload(...)`, so a single
  "alert() function calls only" alert posts the JSON payload to Kronos.
  It mirrors the Kronos parameters but **is not** an independent check on them:
  TradingView's engine, bar timing and data source all differ. Pine slippage is
  left at 0 on purpose — Pine counts ticks (absolute), Kronos counts basis points
  (relative), and there is no honest conversion without the symbol's mintick.
- `src/lib/alerts.ts` — pure parsing, constant-time secret compare, and sizing.
  An alert names a **target state** (long/short/flat), not a trade; `deltaOrder()`
  works out the difference from the current position, so a repeated alert does not
  pyramid. Consequence worth knowing: the linked account's position in a symbol
  is *owned* by the alerts.
- `src/app/api/webhooks/tradingview/[org]/route.ts` — the receiver. Auth is a
  per-org shared secret **in the body**, because TradingView cannot send headers.
  `src/proxy.ts` therefore exempts `/api/webhooks` from the session redirect —
  without that exemption every alert gets a 307 to `/signin`.
- Every alert is persisted to `WebhookAlert` whether or not it trades, with the
  raw body minus the secret. `WebhookEndpoint` holds the org's secret, target
  account and sizing; it is deliberately **not** in `ORG_SCOPED_MODELS` since the
  webhook looks it up with no cookie.
- `src/server/fills.ts` is the single paper-fill path, shared by the order dialog
  and the webhook. Two fill models that drift apart would be worse than the
  indirection.

## Market data

`src/server/market-data.ts` is a provider seam. Default `synthetic` generates
deterministic local series (`src/lib/synthetic.ts`, seeded per symbol) so the
app works with no credentials and screenshots reproduce. `MARKET_DATA_PROVIDER=stooq`
switches to real key-free daily bars; it fails soft, returning an empty series
rather than throwing. **Synthetic prices are not market data** — the UI labels
this wherever numbers are shown, and so should any new surface.

## AI analysis

`src/server/ai.ts` has two engines behind one interface. With `ANTHROPIC_API_KEY`
set it calls `claude-opus-5` with structured output; without one it uses a
deterministic rule-based writer. Both read the *same* numeric snapshot from
`buildSnapshot()`, so they always describe the same facts. `AiAnalysis.model`
records which engine wrote a row and the UI badges it — rule-based output must
never be mistaken for model output. The Claude path falls back to the rule-based
writer on a refusal, a truncated response, or any transport error.

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
  `data:{organizationId}` on creates for every model in `ORG_SCOPED_MODELS`
  (`AuditAction` plus all nine trading models — add new tenant models there).
- **The cookie is a backstop, not the authority.** `activeOrgId` is set with
  `httpOnly:false`, and the extension only checks that the org *exists*, not that
  the caller is a *member*. So an explicit `organizationId` from the caller
  **wins** over the cookie, on reads as well as creates. Always resolve the org
  through `requireActiveOrgId()` (which verifies membership) and pass it
  explicitly — `src/server/kronos.ts` does this on every query. Relying on the
  cookie alone would let a user retarget it at another tenant's data.
- **Use `findFirst`, not `findUnique`, on org-scoped models** — `findUnique` only
  accepts unique filters and rejects the injected column.
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

0. **`Account` and `Order` are taken** — by the Auth.js adapter and by a SQL
   reserved word. The Prisma models are `Account_` / `Order_`, mapped onto the
   `trading_accounts` / `orders` tables.
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
