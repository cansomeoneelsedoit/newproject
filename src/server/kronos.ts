import { prisma } from "@/server/prisma";
import { requireActiveOrgId } from "@/server/org";
import { colonyHealth, inspectionDue, queenAge, round } from "@/lib/kronos";
import type { HealthResult, InspectionDue } from "@/lib/kronos";

/**
 * Read side of the Kronos domain.
 *
 * Every query names `organizationId` explicitly from `requireActiveOrgId()`,
 * which verifies the caller's membership. The client extension in
 * src/lib/prisma.ts also injects a scope from the cookie, but it defers to an
 * explicit value — see the comment there for why that ordering matters.
 *
 * Note: these models are org-scoped, so reads use `findFirst` rather than
 * `findUnique` — `findUnique` only accepts unique filters and rejects the
 * injected `organizationId` column.
 */

export type HiveSummary = {
  id: string;
  name: string;
  type: string;
  status: string;
  queenYear: number | null;
  apiary: { id: string; name: string };
  lastInspectedAt: Date | null;
  health: HealthResult | null;
  due: InspectionDue;
  requeen: boolean;
  honeyKg: number;
};

/** Newest inspection per hive, plus enough context to score and rank it. */
export async function listHives(opts: { apiaryId?: string; status?: string } = {}): Promise<HiveSummary[]> {
  const organizationId = await requireActiveOrgId();
  const now = new Date();

  const hives = await prisma.hive.findMany({
    where: {
      organizationId,
      ...(opts.apiaryId ? { apiaryId: opts.apiaryId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: [{ apiary: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      queenYear: true,
      apiary: { select: { id: true, name: true } },
      inspections: {
        orderBy: { inspectedAt: "desc" },
        take: 1,
        select: {
          inspectedAt: true,
          queenSeen: true,
          eggsSeen: true,
          broodPattern: true,
          queenCells: true,
          framesOfBees: true,
          framesOfBrood: true,
          storesKg: true,
          varroaPer100: true,
          temperament: true,
        },
      },
      harvests: { select: { honeyKg: true } },
    },
  });

  type Row = (typeof hives)[number];

  return hives.map((h: Row) => {
    const latest = h.inspections[0] ?? null;
    return {
      id: h.id,
      name: h.name,
      type: h.type,
      status: h.status,
      queenYear: h.queenYear,
      apiary: h.apiary,
      lastInspectedAt: latest?.inspectedAt ?? null,
      health: latest ? colonyHealth(latest) : null,
      due: inspectionDue(latest?.inspectedAt ?? null, now, h.status),
      requeen: queenAge(h.queenYear, now).shouldRequeen,
      honeyKg: round(h.harvests.reduce((sum: number, x: { honeyKg: number }) => sum + x.honeyKg, 0), 1),
    };
  });
}

export async function getHive(id: string) {
  const organizationId = await requireActiveOrgId();
  return prisma.hive.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      queenYear: true,
      queenSource: true,
      installedAt: true,
      notes: true,
      apiary: { select: { id: true, name: true } },
      inspections: {
        orderBy: { inspectedAt: "desc" },
        select: {
          id: true,
          inspectedAt: true,
          temperament: true,
          broodPattern: true,
          queenSeen: true,
          eggsSeen: true,
          queenCells: true,
          framesOfBees: true,
          framesOfBrood: true,
          storesKg: true,
          varroaPer100: true,
          treatment: true,
          notes: true,
        },
      },
      harvests: {
        orderBy: { harvestedAt: "desc" },
        select: { id: true, harvestedAt: true, honeyKg: true, waxKg: true, frames: true, notes: true },
      },
    },
  });
}

export type ApiarySummary = {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  hiveCount: number;
  activeCount: number;
};

export async function listApiaries(): Promise<ApiarySummary[]> {
  const organizationId = await requireActiveOrgId();
  const apiaries = await prisma.apiary.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      latitude: true,
      longitude: true,
      notes: true,
      hives: { select: { id: true, status: true } },
    },
  });

  type Row = (typeof apiaries)[number];
  return apiaries.map((a: Row) => ({
    id: a.id,
    name: a.name,
    location: a.location,
    latitude: a.latitude,
    longitude: a.longitude,
    notes: a.notes,
    hiveCount: a.hives.length,
    activeCount: a.hives.filter((h: { status: string }) => h.status === "ACTIVE").length,
  }));
}

export async function getApiary(id: string) {
  const organizationId = await requireActiveOrgId();
  return prisma.apiary.findFirst({
    where: { id, organizationId },
    select: { id: true, name: true, location: true, latitude: true, longitude: true, notes: true },
  });
}

/** Apiary id/name pairs for the hive form's dropdown. */
export async function listApiaryOptions(): Promise<{ id: string; name: string }[]> {
  const organizationId = await requireActiveOrgId();
  return prisma.apiary.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Hive id/name pairs for the harvest form's dropdown. */
export async function listHiveOptions(): Promise<{ id: string; name: string }[]> {
  const organizationId = await requireActiveOrgId();
  return prisma.hive.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type HarvestRow = {
  id: string;
  harvestedAt: Date;
  honeyKg: number;
  waxKg: number;
  frames: number | null;
  notes: string | null;
  hive: { id: string; name: string; apiary: { name: string } };
};

export async function listHarvests(): Promise<HarvestRow[]> {
  const organizationId = await requireActiveOrgId();
  return prisma.harvest.findMany({
    where: { organizationId },
    orderBy: { harvestedAt: "desc" },
    select: {
      id: true,
      harvestedAt: true,
      honeyKg: true,
      waxKg: true,
      frames: true,
      notes: true,
      hive: { select: { id: true, name: true, apiary: { select: { name: true } } } },
    },
  });
}

export type DashboardStats = {
  apiaries: number;
  activeHives: number;
  totalHives: number;
  honeyThisYearKg: number;
  dueCount: number;
  attention: HiveSummary[];
  recentInspections: {
    id: string;
    inspectedAt: Date;
    hive: { id: string; name: string };
    notes: string | null;
  }[];
};

export async function getDashboard(): Promise<DashboardStats> {
  const organizationId = await requireActiveOrgId();
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [apiaries, hives, honeyAgg, recentInspections] = await Promise.all([
    prisma.apiary.count({ where: { organizationId } }),
    listHives(),
    prisma.harvest.aggregate({
      where: { organizationId, harvestedAt: { gte: yearStart } },
      _sum: { honeyKg: true },
    }),
    prisma.inspection.findMany({
      where: { organizationId },
      orderBy: { inspectedAt: "desc" },
      take: 6,
      select: {
        id: true,
        inspectedAt: true,
        notes: true,
        hive: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Anything overdue, unhealthy, or flagged for requeening — worst first, so
  // the dashboard leads with the colony most likely to be lost.
  //
  // Colonies that are dead or sold are excluded outright: there is no action
  // left to take on them, and listing a dead hive as "needs requeening" is
  // noise that pushes a colony you could still save further down the page.
  const attention = hives
    .filter((h: HiveSummary) => h.status !== "DEAD" && h.status !== "SOLD")
    .filter(
      (h: HiveSummary) =>
        h.due.due ||
        h.requeen ||
        (h.health !== null && h.health.band !== "STRONG") ||
        h.status === "QUEENLESS",
    )
    .sort((a: HiveSummary, b: HiveSummary) => {
      const score = (h: HiveSummary) => (h.health?.score ?? 50) - h.due.overdueBy;
      return score(a) - score(b);
    })
    .slice(0, 8);

  return {
    apiaries,
    activeHives: hives.filter((h: HiveSummary) => h.status === "ACTIVE").length,
    totalHives: hives.length,
    honeyThisYearKg: round(honeyAgg._sum.honeyKg ?? 0, 1),
    dueCount: hives.filter((h: HiveSummary) => h.due.due).length,
    attention,
    recentInspections,
  };
}
