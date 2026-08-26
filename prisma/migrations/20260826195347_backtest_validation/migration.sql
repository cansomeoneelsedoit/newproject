-- AlterTable
ALTER TABLE "ai_analyses" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "backtests" ADD COLUMN     "accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "failures" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "oos_from" TIMESTAMP(3),
ADD COLUMN     "oos_max_drawdown_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "oos_return_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "oos_sharpe" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "oos_to" TIMESTAMP(3),
ADD COLUMN     "oos_trade_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "oos_win_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "verdict_summary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "walk_forward_passed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "walk_forward_reason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "walk_forward_windows" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "candles" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "instruments" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "positions" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "signals" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "strategies" ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trading_accounts" ALTER COLUMN "organization_id" DROP NOT NULL;
