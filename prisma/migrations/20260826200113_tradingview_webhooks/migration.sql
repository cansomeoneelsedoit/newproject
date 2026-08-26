-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('FILLED', 'IGNORED', 'REJECTED', 'INVALID');

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "account_id" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notional_per_trade" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "slippage_bps" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "commission_bps" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "endpoint_id" TEXT,
    "raw" JSONB NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION,
    "strategy_name" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'REJECTED',
    "note" TEXT,
    "order_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_endpoints_organization_id_key" ON "webhook_endpoints"("organization_id");

-- CreateIndex
CREATE INDEX "webhook_alerts_organization_id_received_at_idx" ON "webhook_alerts"("organization_id", "received_at");

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "trading_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_alerts" ADD CONSTRAINT "webhook_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_alerts" ADD CONSTRAINT "webhook_alerts_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
