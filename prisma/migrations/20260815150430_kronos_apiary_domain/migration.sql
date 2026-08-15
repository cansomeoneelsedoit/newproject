-- CreateEnum
CREATE TYPE "HiveStatus" AS ENUM ('ACTIVE', 'QUEENLESS', 'SWARMED', 'DEAD', 'SOLD');

-- CreateEnum
CREATE TYPE "HiveType" AS ENUM ('LANGSTROTH', 'NATIONAL', 'WARRE', 'TOP_BAR', 'NUC');

-- CreateEnum
CREATE TYPE "Temperament" AS ENUM ('CALM', 'NORMAL', 'DEFENSIVE', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "BroodPattern" AS ENUM ('SOLID', 'SPOTTY', 'NONE');

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "app_name" SET DEFAULT 'Kronos';

-- CreateTable
CREATE TABLE "apiaries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hives" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "apiary_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HiveType" NOT NULL DEFAULT 'LANGSTROTH',
    "status" "HiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "queen_year" INTEGER,
    "queen_source" TEXT,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "hive_id" TEXT NOT NULL,
    "inspected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspector_id" TEXT,
    "temperament" "Temperament" NOT NULL DEFAULT 'NORMAL',
    "brood_pattern" "BroodPattern" NOT NULL DEFAULT 'SOLID',
    "queen_seen" BOOLEAN NOT NULL DEFAULT false,
    "eggs_seen" BOOLEAN NOT NULL DEFAULT false,
    "queen_cells" INTEGER NOT NULL DEFAULT 0,
    "frames_of_bees" INTEGER NOT NULL DEFAULT 0,
    "frames_of_brood" INTEGER NOT NULL DEFAULT 0,
    "stores_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varroa_per_100" DOUBLE PRECISION,
    "treatment" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "hive_id" TEXT NOT NULL,
    "harvested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "honey_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wax_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frames" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apiaries_organization_id_idx" ON "apiaries"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "apiaries_organization_id_name_key" ON "apiaries"("organization_id", "name");

-- CreateIndex
CREATE INDEX "hives_organization_id_idx" ON "hives"("organization_id");

-- CreateIndex
CREATE INDEX "hives_apiary_id_idx" ON "hives"("apiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "hives_organization_id_name_key" ON "hives"("organization_id", "name");

-- CreateIndex
CREATE INDEX "inspections_organization_id_idx" ON "inspections"("organization_id");

-- CreateIndex
CREATE INDEX "inspections_hive_id_inspected_at_idx" ON "inspections"("hive_id", "inspected_at");

-- CreateIndex
CREATE INDEX "harvests_organization_id_idx" ON "harvests"("organization_id");

-- CreateIndex
CREATE INDEX "harvests_hive_id_harvested_at_idx" ON "harvests"("hive_id", "harvested_at");

-- AddForeignKey
ALTER TABLE "apiaries" ADD CONSTRAINT "apiaries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hives" ADD CONSTRAINT "hives_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hives" ADD CONSTRAINT "hives_apiary_id_fkey" FOREIGN KEY ("apiary_id") REFERENCES "apiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_hive_id_fkey" FOREIGN KEY ("hive_id") REFERENCES "hives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_hive_id_fkey" FOREIGN KEY ("hive_id") REFERENCES "hives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Tenant-scope hardening (see CLAUDE.md → Multi-tenancy)
--
-- `organizationId` stays optional in the Prisma schema so call sites can rely
-- on the client extension in src/lib/prisma.ts to stamp it, but the column is
-- NOT NULL here. A write that somehow escapes the extension (missing cookie,
-- non-request context that forgot to stamp explicitly) then fails loudly with
-- a constraint violation instead of quietly writing a row no tenant can see.
-- ----------------------------------------------------------------------------
ALTER TABLE "apiaries" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "hives" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "inspections" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "harvests" ALTER COLUMN "organization_id" SET NOT NULL;
