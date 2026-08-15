"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/prisma";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

// ---- General settings ----
const generalSchema = z.object({
  appName: z.string().min(1),
  defaultLocale: z.enum(["en", "id"]),
});

export async function updateGeneralSettings(input: unknown): Promise<ActionResult> {
  const parsed = generalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  await prisma.setting.upsert({
    where: { id: "singleton" },
    update: { appName: parsed.data.appName, defaultLocale: parsed.data.defaultLocale },
    create: {
      id: "singleton",
      appName: parsed.data.appName,
      defaultLocale: parsed.data.defaultLocale,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
