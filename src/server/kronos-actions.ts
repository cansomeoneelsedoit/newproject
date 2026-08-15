"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/server/prisma";
import { requireActiveOrgId } from "@/server/org";
import { recordAction } from "@/server/audit";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Resolve the caller and their organisation in one step.
 *
 * `requireActiveOrgId()` verifies membership, so the id it returns is safe to
 * write into rows and to scope reads by — unlike the raw cookie.
 */
async function ctx(): Promise<
  { ok: true; userId: string; organizationId: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };
  try {
    const organizationId = await requireActiveOrgId();
    return { ok: true, userId: session.user.id, organizationId };
  } catch {
    return { ok: false, error: "No active organisation" };
  }
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/apiaries");
  revalidatePath("/hives");
  revalidatePath("/harvests");
}

/** Postgres unique-violation code, surfaced as a friendly duplicate-name error. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

// ---------------------------------------------------------------------------
// Apiaries
// ---------------------------------------------------------------------------

const apiarySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createApiary(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = apiarySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const apiary = await prisma.apiary.create({
      data: {
        organizationId: c.organizationId,
        name: parsed.data.name,
        location: parsed.data.location || null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        notes: parsed.data.notes || null,
      },
    });
    await recordAction(prisma, {
      type: "apiary.create",
      entityType: "Apiary",
      entityId: apiary.id,
      description: `Created apiary "${apiary.name}"`,
      userId: c.userId,
      payload: { name: apiary.name },
    });
    refresh();
    return { ok: true, data: { id: apiary.id } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "An apiary with that name already exists" };
    return { ok: false, error: "Could not create the apiary" };
  }
}

export async function deleteApiary(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;

  // Scope the delete by org explicitly: deleteMany takes a plain filter, so a
  // forged id belonging to another tenant simply matches zero rows.
  const apiary = await prisma.apiary.findFirst({
    where: { id, organizationId: c.organizationId },
    select: { id: true, name: true, _count: { select: { hives: true } } },
  });
  if (!apiary) return { ok: false, error: "Apiary not found" };
  if (apiary._count.hives > 0) {
    return { ok: false, error: `Move or remove the ${apiary._count.hives} hive(s) here first` };
  }

  await prisma.apiary.deleteMany({ where: { id, organizationId: c.organizationId } });
  await recordAction(prisma, {
    type: "apiary.delete",
    entityType: "Apiary",
    entityId: id,
    description: `Deleted apiary "${apiary.name}"`,
    userId: c.userId,
    payload: { name: apiary.name },
  });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Hives
// ---------------------------------------------------------------------------

const HIVE_TYPES = ["LANGSTROTH", "NATIONAL", "WARRE", "TOP_BAR", "NUC"] as const;
const HIVE_STATUSES = ["ACTIVE", "QUEENLESS", "SWARMED", "DEAD", "SOLD"] as const;

const hiveSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  apiaryId: z.string().min(1, "Pick an apiary"),
  type: z.enum(HIVE_TYPES).default("LANGSTROTH"),
  status: z.enum(HIVE_STATUSES).default("ACTIVE"),
  queenYear: z.coerce.number().int().min(1980).max(2200).nullable().optional(),
  queenSource: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createHive(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = hiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  // Confirm the apiary belongs to this org before pointing a hive at it —
  // otherwise a forged apiaryId would attach a row across tenants.
  const apiary = await prisma.apiary.findFirst({
    where: { id: parsed.data.apiaryId, organizationId: c.organizationId },
    select: { id: true },
  });
  if (!apiary) return { ok: false, error: "Apiary not found" };

  try {
    const hive = await prisma.hive.create({
      data: {
        organizationId: c.organizationId,
        apiaryId: apiary.id,
        name: parsed.data.name,
        type: parsed.data.type,
        status: parsed.data.status,
        queenYear: parsed.data.queenYear ?? null,
        queenSource: parsed.data.queenSource || null,
        notes: parsed.data.notes || null,
      },
    });
    await recordAction(prisma, {
      type: "hive.create",
      entityType: "Hive",
      entityId: hive.id,
      description: `Added hive "${hive.name}"`,
      userId: c.userId,
      payload: { name: hive.name, apiaryId: apiary.id },
    });
    refresh();
    return { ok: true, data: { id: hive.id } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A hive with that name already exists" };
    return { ok: false, error: "Could not create the hive" };
  }
}

export async function setHiveStatus(id: string, status: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = z.enum(HIVE_STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false, error: "Unknown status" };

  const hive = await prisma.hive.findFirst({
    where: { id, organizationId: c.organizationId },
    select: { id: true, name: true, status: true },
  });
  if (!hive) return { ok: false, error: "Hive not found" };

  await prisma.hive.updateMany({
    where: { id, organizationId: c.organizationId },
    data: { status: parsed.data },
  });
  await recordAction(prisma, {
    type: "hive.status",
    entityType: "Hive",
    entityId: id,
    description: `Set "${hive.name}" to ${parsed.data.toLowerCase()}`,
    userId: c.userId,
    payload: { from: hive.status, to: parsed.data },
  });
  refresh();
  return { ok: true };
}

export async function deleteHive(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const hive = await prisma.hive.findFirst({
    where: { id, organizationId: c.organizationId },
    select: { id: true, name: true },
  });
  if (!hive) return { ok: false, error: "Hive not found" };

  await prisma.hive.deleteMany({ where: { id, organizationId: c.organizationId } });
  await recordAction(prisma, {
    type: "hive.delete",
    entityType: "Hive",
    entityId: id,
    description: `Deleted hive "${hive.name}"`,
    userId: c.userId,
    payload: { name: hive.name },
  });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------------

const inspectionSchema = z.object({
  hiveId: z.string().min(1),
  inspectedAt: z.string().optional(),
  temperament: z.enum(["CALM", "NORMAL", "DEFENSIVE", "AGGRESSIVE"]).default("NORMAL"),
  broodPattern: z.enum(["SOLID", "SPOTTY", "NONE"]).default("SOLID"),
  queenSeen: z.boolean().default(false),
  eggsSeen: z.boolean().default(false),
  queenCells: z.coerce.number().int().min(0).max(99).default(0),
  framesOfBees: z.coerce.number().int().min(0).max(50).default(0),
  framesOfBrood: z.coerce.number().int().min(0).max(50).default(0),
  storesKg: z.coerce.number().min(0).max(200).default(0),
  varroaPer100: z.coerce.number().min(0).max(100).nullable().optional(),
  treatment: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function logInspection(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = inspectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  const hive = await prisma.hive.findFirst({
    where: { id: parsed.data.hiveId, organizationId: c.organizationId },
    select: { id: true, name: true },
  });
  if (!hive) return { ok: false, error: "Hive not found" };

  const inspection = await prisma.inspection.create({
    data: {
      organizationId: c.organizationId,
      hiveId: hive.id,
      inspectorId: c.userId,
      inspectedAt: parsed.data.inspectedAt ? new Date(parsed.data.inspectedAt) : new Date(),
      temperament: parsed.data.temperament,
      broodPattern: parsed.data.broodPattern,
      queenSeen: parsed.data.queenSeen,
      eggsSeen: parsed.data.eggsSeen,
      queenCells: parsed.data.queenCells,
      framesOfBees: parsed.data.framesOfBees,
      framesOfBrood: parsed.data.framesOfBrood,
      storesKg: parsed.data.storesKg,
      varroaPer100: parsed.data.varroaPer100 ?? null,
      treatment: parsed.data.treatment || null,
      notes: parsed.data.notes || null,
    },
  });

  await recordAction(prisma, {
    type: "inspection.create",
    entityType: "Inspection",
    entityId: inspection.id,
    description: `Inspected "${hive.name}"`,
    userId: c.userId,
    payload: { hiveId: hive.id, hiveName: hive.name },
  });
  refresh();
  revalidatePath(`/hives/${hive.id}`);
  return { ok: true, data: { id: inspection.id } };
}

// ---------------------------------------------------------------------------
// Harvests
// ---------------------------------------------------------------------------

const harvestSchema = z.object({
  hiveId: z.string().min(1, "Pick a hive"),
  harvestedAt: z.string().optional(),
  honeyKg: z.coerce.number().min(0).max(1000),
  waxKg: z.coerce.number().min(0).max(1000).default(0),
  frames: z.coerce.number().int().min(0).max(200).nullable().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function recordHarvest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = harvestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  const hive = await prisma.hive.findFirst({
    where: { id: parsed.data.hiveId, organizationId: c.organizationId },
    select: { id: true, name: true },
  });
  if (!hive) return { ok: false, error: "Hive not found" };

  const harvest = await prisma.harvest.create({
    data: {
      organizationId: c.organizationId,
      hiveId: hive.id,
      harvestedAt: parsed.data.harvestedAt ? new Date(parsed.data.harvestedAt) : new Date(),
      honeyKg: parsed.data.honeyKg,
      waxKg: parsed.data.waxKg,
      frames: parsed.data.frames ?? null,
      notes: parsed.data.notes || null,
    },
  });

  await recordAction(prisma, {
    type: "harvest.create",
    entityType: "Harvest",
    entityId: harvest.id,
    description: `Harvested ${parsed.data.honeyKg} kg from "${hive.name}"`,
    userId: c.userId,
    payload: { hiveId: hive.id, honeyKg: parsed.data.honeyKg },
  });
  refresh();
  revalidatePath(`/hives/${hive.id}`);
  return { ok: true, data: { id: harvest.id } };
}

export async function deleteHarvest(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const harvest = await prisma.harvest.findFirst({
    where: { id, organizationId: c.organizationId },
    select: { id: true, honeyKg: true, hive: { select: { name: true } } },
  });
  if (!harvest) return { ok: false, error: "Harvest not found" };

  await prisma.harvest.deleteMany({ where: { id, organizationId: c.organizationId } });
  await recordAction(prisma, {
    type: "harvest.delete",
    entityType: "Harvest",
    entityId: id,
    description: `Removed a ${harvest.honeyKg} kg harvest from "${harvest.hive.name}"`,
    userId: c.userId,
    payload: { honeyKg: harvest.honeyKg },
  });
  refresh();
  return { ok: true };
}
