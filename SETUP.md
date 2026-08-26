# Kronos — running it locally

AI-assisted trading platform: market data → strategy signals → backtesting →
portfolio and paper trading. Next.js 16 + Postgres + Prisma + Auth.js.

- **Dev sign-in:** `dev@kronos.local` / `devpassword`
- **Ports:** app **3004**, Postgres **5435** (host side)

**It runs with no credentials.** Prices default to deterministic locally
generated series, and the analysis feature falls back to a built-in rule-based
writer when there's no Anthropic key. You do not need an API key or a market
data subscription to see the whole thing working.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22.x+ | `node --version` |
| npm | 10+ | ships with Node |
| Postgres | 16 | either via Docker (below) or installed locally |
| Git | any | repo is LF; CRLF warnings on Windows are normal and harmless |

---

## Option A — Docker for Postgres, app on your machine (recommended)

The most reliable mix: the database in a container, the app on host Node so
hot-reload and breakpoints behave normally.

```bash
git clone <your-kronos-remote> kronos      # or: git clone kronos.bundle kronos
cd kronos

cp .env.example .env                       # Windows PowerShell: copy .env.example .env
docker compose up -d db                    # Postgres 16 on localhost:5435

npm install
npm run setup                              # generate client, migrate, seed
npm run dev                                # http://localhost:3004
```

Sign in with `dev@kronos.local` / `devpassword`.

`.env.example` already points `DATABASE_URL` at the compose database
(`kronos:kronos@localhost:5435/kronos`), so no editing is needed for this path.

## Option B — everything in Docker

```bash
cp .env.example .env
docker compose up --build                  # db + web; migrates and seeds on boot
```

App on <http://localhost:3004>. The web container runs
`prisma migrate deploy && seed && next dev`, with source bind-mounted for
hot reload.

## Option C — your own Postgres, no Docker

Create a database, then point `.env` at it:

```bash
createdb kronos                            # or use an existing server/database
cp .env.example .env
# edit DATABASE_URL in .env to your own connection string
npm install
npm run setup
npm run dev
```

---

## What `npm run setup` does

```
prisma generate       # build the typed client from prisma/schema.prisma
prisma migrate deploy # create the tables
tsx prisma/seed.ts    # demo org, dev login, 6 instruments × 400 bars,
                      # 4 strategies, signals, 4 backtests, a paper account
```

It's **idempotent** — safe to re-run. Every row is keyed on a stable business
value, not a timestamp, so re-seeding updates rather than duplicating.

---

## Everyday commands

```bash
npm run dev              # dev server on :3004
npm test                 # 140 unit tests (quant core, validation, TradingView)
npm run typecheck        # tsc --noEmit — run before committing
npm run lint             # eslint
npm run build            # production build
npm run prisma:studio    # browse the database on :5555
npm run db:reset         # drop, re-migrate, re-seed (destructive)
```

---

## Configuration you may want

Everything below is optional; the app works without any of it.

### Your own superuser login

The demo login is public — it's printed above and in the README — so use it to
look around, not to own anything. To sign in as yourself, put this in `.env`:

```env
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=your-password
ADMIN_NAME=Your Name
```

then `npm run db:seed`. You get a SUPERUSER who owns the demo org, which means
the **Users** page in the sidebar — add, edit, reset passwords, delete.

The credentials live in `.env` (gitignored) and never in `seed.ts`, deliberately:
a password committed to a repository stays in its history after you delete it,
and changing it later doesn't un-leak the old one. Re-running the seed resets
this password to whatever `ADMIN_PASSWORD` currently says, so it's also how you
get back in if you lock yourself out.

### Real market data instead of generated prices

```env
MARKET_DATA_PROVIDER=stooq
```

Pulls real key-free daily bars from Stooq. It fails soft — a network problem
returns an empty series and a message in the UI rather than an error page. The
default, `synthetic`, generates deterministic series locally (seeded per symbol,
so the same symbol always produces the same history).

**Generated prices are not market data.** The UI labels this wherever numbers
appear, and anything computed from them — signals, backtests, P&L — is a test of
the machinery rather than a claim about a real market.

### Claude-written analysis

```env
ANTHROPIC_API_KEY=sk-ant-...
```

With a key, **Analyse** on an instrument page calls `claude-opus-5` and asks it
to interpret the indicator snapshot. Without one, the same button runs a
deterministic rule-based writer over the identical snapshot. Every stored
analysis records which engine produced it and the UI badges it, so the two are
never confused.

---

## Connecting TradingView

Kronos generates the Pine script; TradingView fires the alerts; Kronos fills the
paper orders. Open **TradingView** in the sidebar and work down the page:

1. Pick a **paper account** and a **notional per signal**, then Save. Until an
   account is linked, every alert is rejected (and logged as such).
2. Copy the **Pine script** for a strategy → TradingView → Pine Editor → Add to
   chart.
3. Create an alert on that script. Trigger: **"alert() function calls only"**.
   Notifications → Webhook URL: the URL shown on the page. **Leave the alert
   message box empty** — the script supplies its own JSON.

Two things to know before you rely on it:

- **TradingView cannot reach `localhost`.** The webhook URL has to be public.
  For a local instance, run a tunnel (`cloudflared tunnel --url
  http://localhost:3004`, `ngrok http 3004`, …) and create the alert against the
  tunnel's hostname. The page warns you when the URL it is showing is local.
- **The secret lives in the script.** TradingView cannot send custom headers, so
  the shared secret travels in the alert body and is baked into the script you
  copy. Treat that script as a credential; **Rotate secret** invalidates every
  copy already pasted into TradingView.

Alerts set a *target position* — long, short or flat — rather than adding a
trade, so a repeated alert will not pyramid, and a "buy" on a symbol you hold
manually will resize that holding. Use a dedicated paper account if you also
trade by hand. Every alert is logged on the same page whether or not it traded,
including rejected ones.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Can't reach database server at localhost:5435` | Postgres isn't up. `docker compose up -d db`, or point `DATABASE_URL` at your own server. |
| `port is already allocated` on 5435 | Something else holds the port. Change the host side of the mapping in `docker-compose.yml` (`"5436:5432"`) and update `DATABASE_URL` to match. |
| Port 3004 in use | `npm run dev -- -p 3005`, and set `AUTH_URL=http://localhost:3005` in `.env` — Auth.js needs the two to agree or sign-in redirects fail. |
| Sign-in loops back to `/signin` | `AUTH_SECRET` missing or `AUTH_URL` doesn't match the address you're browsing. |
| `The table 'public.instruments' does not exist` | Migrations weren't applied — run `npm run setup`. |
| Empty dashboard after setup | The seed ran against a different database than the app reads. Check `DATABASE_URL` is the same in both shells. |
| Type errors only on build, not in the editor | The legacy Prisma generator types the client loosely. Always run `npm run typecheck` before committing. |
| `git` reports CRLF warnings on Windows | Expected — the repo is LF. Harmless. |
| TradingView alert returns 307 / lands on `/signin` | The webhook path is being caught by the auth proxy. `/api/webhooks` is exempted in `src/proxy.ts`; check the matcher there if you've edited it. |
| TradingView alert returns `Bad secret` | The pasted script predates a **Rotate secret**. Re-copy it from the TradingView page. |
| Alerts log as `REJECTED — No instrument named …` | TradingView's ticker doesn't match a Kronos symbol. Add the instrument with the exact ticker the alert sends. |

---

## Where things live

```
src/lib/            pure quant core — no Prisma, no React, all unit-tested
  indicators.ts     SMA, EMA, RSI, ATR, MACD, Bollinger, Donchian
  strategies.ts     four strategies; each maps candles → target position
  backtest.ts       next-bar-open execution, commission + slippage
  metrics.ts        CAGR, drawdown, Sharpe, Sortino, profit factor
  portfolio.ts      average-cost position accounting
  validation.ts     out-of-sample split, walk-forward, acceptance gates
  pine.ts           Pine v5 generation for TradingView
  alerts.ts         TradingView alert parsing and position sizing
  synthetic.ts      deterministic price generation
src/server/         data access, server actions, market data, AI layer
src/app/(app)/      dashboard, instruments, signals, backtests, portfolio
prisma/             schema, migrations, seed
```

See `CLAUDE.md` for the architectural notes — especially the no-lookahead rule
in the backtester and the tenant-scoping rules, both of which are easy to break
by accident.
