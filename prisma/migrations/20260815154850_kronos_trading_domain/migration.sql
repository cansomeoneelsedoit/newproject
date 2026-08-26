-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPERUSER');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('EQUITY', 'CRYPTO', 'FX', 'COMMODITY', 'INDEX');

-- CreateEnum
CREATE TYPE "Timeframe" AS ENUM ('D1', 'H1', 'M15');

-- CreateEnum
CREATE TYPE "StrategyKind" AS ENUM ('SMA_CROSSOVER', 'RSI_REVERSION', 'DONCHIAN_BREAKOUT', 'MACD_TREND');

-- CreateEnum
CREATE TYPE "SignalSide" AS ENUM ('BUY', 'SELL', 'FLAT');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("user_id","organization_id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "app_name" TEXT NOT NULL DEFAULT 'Kronos',
    "default_locale" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instruments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_class" "AssetClass" NOT NULL DEFAULT 'EQUITY',
    "exchange" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "watched" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "instrument_id" TEXT NOT NULL,
    "timeframe" "Timeframe" NOT NULL DEFAULT 'D1',
    "ts" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "kind" "StrategyKind" NOT NULL,
    "params" JSONB NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "instrument_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "side" "SignalSide" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "instrument_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "initial_cash" DOUBLE PRECISION NOT NULL,
    "commission_bps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slippage_bps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "final_equity" DOUBLE PRECISION NOT NULL,
    "total_return_pct" DOUBLE PRECISION NOT NULL,
    "cagr_pct" DOUBLE PRECISION NOT NULL,
    "max_drawdown_pct" DOUBLE PRECISION NOT NULL,
    "sharpe" DOUBLE PRECISION NOT NULL,
    "win_rate_pct" DOUBLE PRECISION NOT NULL,
    "profit_factor" DOUBLE PRECISION NOT NULL,
    "trade_count" INTEGER NOT NULL,
    "equity_curve" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backtests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_trades" (
    "id" TEXT NOT NULL,
    "backtest_id" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "entry_ts" TIMESTAMP(3) NOT NULL,
    "entry_price" DOUBLE PRECISION NOT NULL,
    "exit_ts" TIMESTAMP(3),
    "exit_price" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "return_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exit_reason" TEXT,

    CONSTRAINT "backtest_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "starting_cash" DOUBLE PRECISION NOT NULL,
    "cash" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "account_id" TEXT NOT NULL,
    "instrument_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realized_pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "account_id" TEXT NOT NULL,
    "instrument_id" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "type" "OrderType" NOT NULL DEFAULT 'MARKET',
    "quantity" DOUBLE PRECISION NOT NULL,
    "limit_price" DOUBLE PRECISION,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "filled_price" DOUBLE PRECISION,
    "filled_at" TIMESTAMP(3),
    "note" TEXT,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "instrument_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_actions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "description" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "undone" BOOLEAN NOT NULL DEFAULT false,
    "undone_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_memberships_organization_id_idx" ON "organization_memberships"("organization_id");

-- CreateIndex
CREATE INDEX "instruments_organization_id_idx" ON "instruments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "instruments_organization_id_symbol_key" ON "instruments"("organization_id", "symbol");

-- CreateIndex
CREATE INDEX "candles_organization_id_idx" ON "candles"("organization_id");

-- CreateIndex
CREATE INDEX "candles_instrument_id_timeframe_ts_idx" ON "candles"("instrument_id", "timeframe", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "candles_instrument_id_timeframe_ts_key" ON "candles"("instrument_id", "timeframe", "ts");

-- CreateIndex
CREATE INDEX "strategies_organization_id_idx" ON "strategies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_organization_id_name_key" ON "strategies"("organization_id", "name");

-- CreateIndex
CREATE INDEX "signals_organization_id_idx" ON "signals"("organization_id");

-- CreateIndex
CREATE INDEX "signals_instrument_id_ts_idx" ON "signals"("instrument_id", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "signals_instrument_id_strategy_id_ts_key" ON "signals"("instrument_id", "strategy_id", "ts");

-- CreateIndex
CREATE INDEX "backtests_organization_id_idx" ON "backtests"("organization_id");

-- CreateIndex
CREATE INDEX "backtests_instrument_id_created_at_idx" ON "backtests"("instrument_id", "created_at");

-- CreateIndex
CREATE INDEX "backtest_trades_backtest_id_entry_ts_idx" ON "backtest_trades"("backtest_id", "entry_ts");

-- CreateIndex
CREATE INDEX "trading_accounts_organization_id_idx" ON "trading_accounts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "trading_accounts_organization_id_name_key" ON "trading_accounts"("organization_id", "name");

-- CreateIndex
CREATE INDEX "positions_organization_id_idx" ON "positions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "positions_account_id_instrument_id_key" ON "positions"("account_id", "instrument_id");

-- CreateIndex
CREATE INDEX "orders_organization_id_idx" ON "orders"("organization_id");

-- CreateIndex
CREATE INDEX "orders_account_id_placed_at_idx" ON "orders"("account_id", "placed_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "ai_analyses_organization_id_idx" ON "ai_analyses"("organization_id");

-- CreateIndex
CREATE INDEX "ai_analyses_instrument_id_created_at_idx" ON "ai_analyses"("instrument_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_actions_organization_id_idx" ON "audit_actions"("organization_id");

-- CreateIndex
CREATE INDEX "audit_actions_entity_type_entity_id_created_at_idx" ON "audit_actions"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_actions_user_id_created_at_idx" ON "audit_actions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_actions_undone_created_at_idx" ON "audit_actions"("undone", "created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candles" ADD CONSTRAINT "candles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candles" ADD CONSTRAINT "candles_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtest_trades" ADD CONSTRAINT "backtest_trades_backtest_id_fkey" FOREIGN KEY ("backtest_id") REFERENCES "backtests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_actions" ADD CONSTRAINT "audit_actions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_actions" ADD CONSTRAINT "audit_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Tenant-scope hardening (see CLAUDE.md → Multi-tenancy)
--
-- `organizationId` stays optional in the Prisma schema so call sites can rely on
-- the client extension in src/lib/prisma.ts to stamp it, but the column is NOT
-- NULL here. A write that escapes the extension (missing cookie, non-request
-- context that forgot to stamp) then fails loudly with a constraint violation
-- instead of quietly writing a row no tenant can see.
-- ----------------------------------------------------------------------------
ALTER TABLE "instruments" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "candles" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "strategies" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "signals" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "backtests" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "trading_accounts" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "positions" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "ai_analyses" ALTER COLUMN "organization_id" SET NOT NULL;
