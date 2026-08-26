"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/prisma";
import { requireActiveOrgId } from "@/server/org";
import { auth } from "@/auth";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function assertSuperuser(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };
  if (session.user.role !== "SUPERUSER") return { ok: false, error: "Forbidden" };
  return { ok: true, userId: session.user.id };
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["USER", "SUPERUSER"]).default("USER"),
  password: z.string().min(6),
});

export async function createUser(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await assertSuperuser();
  if (!auth.ok) return auth;
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  // Every Kronos page resolves the caller's organisation and throws without
  // one, so a user created with no membership can sign in and then sees
  // nothing but "No active organisation". They join the creator's active org —
  // that is the org the superuser is provisioning them for.
  let organizationId: string;
  try {
    organizationId = await requireActiveOrgId();
  } catch {
    return { ok: false, error: "No active organisation to add the user to" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    // One transaction: a user without their membership is a broken account, so
    // the two rows land together or not at all.
    const u = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          role: parsed.data.role,
          passwordHash,
        },
      });
      await tx.organizationMembership.create({
        data: { userId: created.id, organizationId, role: "MEMBER" },
      });
      return created;
    });
    revalidatePath("/admin/users");
    return { ok: true, data: { id: u.id } };
  } catch {
    return { ok: false, error: "Email is already in use" };
  }
}

const updateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["USER", "SUPERUSER"]),
});

export async function updateUser(id: string, input: unknown): Promise<ActionResult> {
  const auth = await assertSuperuser();
  if (!auth.ok) return auth;
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  // Refuse to demote the last remaining superuser — leaves no one to run
  // /admin/users.
  if (parsed.data.role === "USER") {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPERUSER") {
      const supers = await prisma.user.count({ where: { role: "SUPERUSER" } });
      if (supers <= 1) return { ok: false, error: "Can't demote the only superuser" };
    }
  }
  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
      },
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch {
    return { ok: false, error: "Email is already in use" };
  }
}

const resetSchema = z.object({ password: z.string().min(6) });

export async function resetUserPassword(id: string, input: unknown): Promise<ActionResult> {
  const auth = await assertSuperuser();
  if (!auth.ok) return auth;
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Password must be at least 6 characters" };
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const a = await assertSuperuser();
  if (!a.ok) return a;
  if (id === a.userId) return { ok: false, error: "Can't delete yourself" };
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === "SUPERUSER") {
    const supers = await prisma.user.count({ where: { role: "SUPERUSER" } });
    if (supers <= 1) return { ok: false, error: "Can't delete the only superuser" };
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { ok: true };
}
