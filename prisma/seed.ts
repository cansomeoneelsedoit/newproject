import { PrismaClient, UserRole, OrgRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Idempotent seed for Kronos.
 *
 * Runs on every boot (see `npm run start:prod`), so everything upserts and the
 * demo data is keyed off stable names rather than generated ids.
 *
 * This is a non-request context: the client extension in src/lib/prisma.ts
 * cannot read a cookie here, so every tenant row stamps `organizationId`
 * explicitly. The column is NOT NULL, so a row that forgot to would fail loudly.
 */

const DAY = 86_400_000;

/**
 * N days ago, snapped to UTC midnight.
 *
 * Snapping matters: this seed re-runs on every boot (`npm run start:prod`), and
 * a timestamp carrying the current time-of-day would differ on every run.
 * Demo rows are matched on stable business keys rather than timestamps anyway
 * (see below), but a stable date keeps re-seeded data from drifting by hours.
 */
function daysAgo(n: number): Date {
  const d = new Date(Date.now() - n * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "kronos" },
    update: { name: "Kronos Apiaries" },
    create: { name: "Kronos Apiaries", slug: "kronos" },
  });

  const passwordHash = await bcrypt.hash("devpassword", 10);
  const user = await prisma.user.upsert({
    where: { email: "dev@kronos.local" },
    update: {},
    create: {
      email: "dev@kronos.local",
      name: "Dev User",
      passwordHash,
      role: UserRole.SUPERUSER,
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: OrgRole.OWNER },
  });

  await prisma.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", appName: "Kronos", defaultLocale: "en" },
  });

  // --- Apiaries ------------------------------------------------------------

  const apiarySpecs = [
    {
      name: "Home Orchard",
      location: "Behind the packing shed",
      latitude: -34.9285,
      longitude: 138.6007,
      notes: "Early almond and stone fruit flow. Vehicle access all year.",
    },
    {
      name: "River Flats",
      location: "Lower paddock, red gum stand",
      latitude: -34.812,
      longitude: 138.7431,
      notes: "Strong red gum flow in a good year. Boggy after rain — take the ute.",
    },
    {
      name: "Ridge Line",
      location: "Neighbour's block, east fence",
      latitude: -34.7551,
      longitude: 138.8802,
      notes: "Exposed and windy. Strap the lids down.",
    },
  ];

  const apiaries: Record<string, string> = {};
  for (const spec of apiarySpecs) {
    const existing = await prisma.apiary.findFirst({
      where: { organizationId: org.id, name: spec.name },
      select: { id: true },
    });
    const row = existing
      ? await prisma.apiary.update({ where: { id: existing.id }, data: spec })
      : await prisma.apiary.create({ data: { ...spec, organizationId: org.id } });
    apiaries[spec.name] = row.id;
  }

  // --- Hives ---------------------------------------------------------------

  const thisYear = new Date().getUTCFullYear();

  const hiveSpecs = [
    { name: "H-01", apiary: "Home Orchard", type: "LANGSTROTH", status: "ACTIVE", queenYear: thisYear, queenSource: "Split from H-04", installedDaysAgo: 400 },
    { name: "H-02", apiary: "Home Orchard", type: "LANGSTROTH", status: "ACTIVE", queenYear: thisYear - 1, queenSource: "Bought — Adelaide Hills breeder", installedDaysAgo: 700 },
    { name: "H-03", apiary: "Home Orchard", type: "NUC", status: "ACTIVE", queenYear: thisYear, queenSource: "Caught swarm", installedDaysAgo: 60 },
    { name: "H-04", apiary: "River Flats", type: "LANGSTROTH", status: "ACTIVE", queenYear: thisYear - 3, queenSource: "Original package", installedDaysAgo: 1200 },
    { name: "H-05", apiary: "River Flats", type: "NATIONAL", status: "QUEENLESS", queenYear: thisYear - 2, queenSource: "Split", installedDaysAgo: 800 },
    { name: "H-06", apiary: "River Flats", type: "LANGSTROTH", status: "ACTIVE", queenYear: thisYear - 1, queenSource: "Split", installedDaysAgo: 500 },
    { name: "H-07", apiary: "Ridge Line", type: "TOP_BAR", status: "ACTIVE", queenYear: thisYear - 1, queenSource: "Caught swarm", installedDaysAgo: 450 },
    { name: "H-08", apiary: "Ridge Line", type: "LANGSTROTH", status: "SWARMED", queenYear: thisYear - 2, queenSource: "Split", installedDaysAgo: 900 },
    { name: "H-09", apiary: "Ridge Line", type: "LANGSTROTH", status: "DEAD", queenYear: thisYear - 3, queenSource: "Split", installedDaysAgo: 1100 },
  ] as const;

  const hives: Record<string, string> = {};
  for (const spec of hiveSpecs) {
    const data = {
      name: spec.name,
      apiaryId: apiaries[spec.apiary],
      type: spec.type,
      status: spec.status,
      queenYear: spec.queenYear,
      queenSource: spec.queenSource,
      installedAt: daysAgo(spec.installedDaysAgo),
    };
    const existing = await prisma.hive.findFirst({
      where: { organizationId: org.id, name: spec.name },
      select: { id: true },
    });
    const row = existing
      ? await prisma.hive.update({ where: { id: existing.id }, data })
      : await prisma.hive.create({ data: { ...data, organizationId: org.id } });
    hives[spec.name] = row.id;
  }

  // --- Inspections ---------------------------------------------------------
  // A spread of dates and conditions so the dashboard has something to rank:
  // healthy colonies, an overdue one, a queenless one, and a mite problem.

  const inspectionSpecs = [
    { hive: "H-01", daysAgo: 3, temperament: "CALM", broodPattern: "SOLID", queenSeen: true, eggsSeen: true, queenCells: 0, framesOfBees: 11, framesOfBrood: 7, storesKg: 24, varroaPer100: 0.4, notes: "Textbook. Added a super." },
    { hive: "H-01", daysAgo: 19, temperament: "CALM", broodPattern: "SOLID", queenSeen: false, eggsSeen: true, queenCells: 0, framesOfBees: 9, framesOfBrood: 6, storesKg: 18, varroaPer100: 0.6, notes: "Building well." },
    { hive: "H-02", daysAgo: 6, temperament: "NORMAL", broodPattern: "SOLID", queenSeen: true, eggsSeen: true, queenCells: 2, framesOfBees: 12, framesOfBrood: 8, storesKg: 28, varroaPer100: 1.4, notes: "Swarm cells on the bottom bars — split next visit.", treatment: null },
    { hive: "H-03", daysAgo: 8, temperament: "CALM", broodPattern: "SOLID", queenSeen: true, eggsSeen: true, queenCells: 0, framesOfBees: 5, framesOfBrood: 3, storesKg: 7, varroaPer100: 0.2, notes: "Nuc coming along. Feed if the flow stops." },
    { hive: "H-04", daysAgo: 34, temperament: "DEFENSIVE", broodPattern: "SPOTTY", queenSeen: false, eggsSeen: true, queenCells: 0, framesOfBees: 7, framesOfBrood: 3, storesKg: 11, varroaPer100: 4.2, notes: "Mite load well over threshold. Treat urgently.", treatment: "Oxalic acid vapour" },
    { hive: "H-05", daysAgo: 11, temperament: "NORMAL", broodPattern: "NONE", queenSeen: false, eggsSeen: false, queenCells: 0, framesOfBees: 4, framesOfBrood: 0, storesKg: 9, varroaPer100: 2.1, notes: "No sign of a queen and no eggs. Combine or requeen." },
    { hive: "H-06", daysAgo: 5, temperament: "CALM", broodPattern: "SOLID", queenSeen: true, eggsSeen: true, queenCells: 0, framesOfBees: 10, framesOfBrood: 6, storesKg: 22, varroaPer100: 0.8, notes: "Strong. Room to expand." },
    { hive: "H-07", daysAgo: 41, temperament: "AGGRESSIVE", broodPattern: "SOLID", queenSeen: false, eggsSeen: true, queenCells: 0, framesOfBees: 8, framesOfBrood: 5, storesKg: 16, varroaPer100: null, notes: "Hot colony — veil up. Overdue a visit." },
    { hive: "H-08", daysAgo: 22, temperament: "NORMAL", broodPattern: "NONE", queenSeen: false, eggsSeen: false, queenCells: 4, framesOfBees: 3, framesOfBrood: 0, storesKg: 6, varroaPer100: 1.1, notes: "Swarmed out. Virgin queen may still mate." },
  ] as const;

  for (const spec of inspectionSpecs) {
    const inspectedAt = daysAgo(spec.daysAgo);
    // Match on (hive, notes) rather than the timestamp: notes are unique per
    // hive in this fixture and stable across runs, so re-seeding updates
    // nothing instead of inserting a duplicate set every boot.
    const existing = await prisma.inspection.findFirst({
      where: { organizationId: org.id, hiveId: hives[spec.hive], notes: spec.notes },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.inspection.create({
      data: {
        organizationId: org.id,
        hiveId: hives[spec.hive],
        inspectorId: user.id,
        inspectedAt,
        temperament: spec.temperament,
        broodPattern: spec.broodPattern,
        queenSeen: spec.queenSeen,
        eggsSeen: spec.eggsSeen,
        queenCells: spec.queenCells,
        framesOfBees: spec.framesOfBees,
        framesOfBrood: spec.framesOfBrood,
        storesKg: spec.storesKg,
        varroaPer100: spec.varroaPer100,
        treatment: "treatment" in spec ? (spec.treatment ?? null) : null,
        notes: spec.notes,
      },
    });
  }

  // --- Harvests ------------------------------------------------------------

  const harvestSpecs = [
    { hive: "H-01", daysAgo: 40, honeyKg: 18.5, waxKg: 0.6, frames: 8, notes: "Orange blossom, very light." },
    { hive: "H-02", daysAgo: 42, honeyKg: 22.0, waxKg: 0.8, frames: 10, notes: "Mixed floral." },
    { hive: "H-04", daysAgo: 45, honeyKg: 11.2, waxKg: 0.4, frames: 6, notes: "Light pull — colony was struggling." },
    { hive: "H-06", daysAgo: 38, honeyKg: 19.8, waxKg: 0.7, frames: 9, notes: "Red gum. Dark and strong." },
    { hive: "H-01", daysAgo: 400, honeyKg: 15.0, waxKg: 0.5, frames: 7, notes: "Last season." },
    { hive: "H-02", daysAgo: 405, honeyKg: 17.4, waxKg: 0.6, frames: 8, notes: "Last season." },
    { hive: "H-07", daysAgo: 410, honeyKg: 9.1, waxKg: 0.3, frames: 5, notes: "Last season, top bar — cut comb." },
  ] as const;

  for (const spec of harvestSpecs) {
    const harvestedAt = daysAgo(spec.daysAgo);
    // Same reasoning as inspections: (hive, notes) is the stable key here.
    const existing = await prisma.harvest.findFirst({
      where: { organizationId: org.id, hiveId: hives[spec.hive], notes: spec.notes },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.harvest.create({
      data: {
        organizationId: org.id,
        hiveId: hives[spec.hive],
        harvestedAt,
        honeyKg: spec.honeyKg,
        waxKg: spec.waxKg,
        frames: spec.frames,
        notes: spec.notes,
      },
    });
  }

  console.log("Seeded Kronos:", {
    org: org.slug,
    user: user.email,
    apiaries: Object.keys(apiaries).length,
    hives: Object.keys(hives).length,
    inspections: inspectionSpecs.length,
    harvests: harvestSpecs.length,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
