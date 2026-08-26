import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Models that carry an `organizationId` column. Queries against these get
 * auto-scoped by the active organisation from the cookie; creates get
 * auto-stamped. Other models (lookup tables like ExchangeRateHistory, child
 * tables that go through a scoped parent, Auth.js tables) are left alone.
 */
const ORG_SCOPED_MODELS = new Set([
  "AuditAction",
  "Instrument",
  "Candle",
  "Strategy",
  "Signal",
  "Backtest",
  "Account_",
  "Position",
  "Order_",
  "AiAnalysis",
  "WebhookAlert",
]);

const READ_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const WRITE_WHERE_OPS = new Set([
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

const CREATE_OPS = new Set(["create", "createMany"]);

/**
 * Read the active organisation id from the request cookie. Returns null in
 * non-request contexts (seed, CLI scripts) so those paths skip scoping and
 * can write to any org explicitly.
 *
 * Validates the cookie value against the `organizations` table before
 * returning it — stale cookies (pointing at orgs deleted by a DB reset or
 * never seeded in this environment) caused P2003 FK violations on writes
 * and silently empty result sets on reads. If invalid, returns null so
 * call sites can fall back to explicit stamping.
 */
async function getActiveOrgIdFromCookie(
   
  basePrisma: any,
): Promise<string | null> {
  try {
    // Dynamic import keeps next/headers out of seed/CLI bundles. cookies()
    // throws if called outside a request context; we catch and return null.
    const mod = await import("next/headers");
    const c = await mod.cookies();
    const raw = c.get("activeOrgId")?.value;
    if (!raw) return null;
    const exists = await basePrisma.organization.findUnique({
      where: { id: raw },
      select: { id: true },
    });
    return exists?.id ?? null;
  } catch {
    return null;
  }
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!ORG_SCOPED_MODELS.has(model)) return query(args);
          const orgId = await getActiveOrgIdFromCookie(base);
          // Non-request context (seed / build) OR invalid/missing cookie:
          // pass through. Callers in those contexts are expected to set
          // organizationId explicitly.
          if (!orgId) return query(args);

           
          const a = args as any;
          if (READ_OPS.has(operation) || WRITE_WHERE_OPS.has(operation)) {
            // Spread order matters, and matches the `create` branch below: an
            // explicit organizationId from the caller WINS over the cookie.
            //
            // The cookie is only checked against "does this org exist" (see
            // getActiveOrgIdFromCookie) — not "is the caller a member of it" —
            // and it is set with httpOnly:false, so a user can point it at any
            // org id they can guess. Letting it override the caller would turn
            // every correctly-scoped query into a cross-tenant read.
            //
            // Call sites therefore resolve the org through requireActiveOrgId()
            // (which DOES verify membership) and pass it explicitly; this
            // injection is only a backstop for code that forgot to scope.
            a.where = { organizationId: orgId, ...(a.where ?? {}) };
          }
          // Spread order matters: explicit organizationId on the caller's
          // data object wins, so call sites that have already validated
          // an org membership (e.g. via getActiveOrgId from @/server/org)
          // aren't overridden by a stale-but-valid-looking cookie.
          if (operation === "create") {
            a.data = { organizationId: orgId, ...(a.data ?? {}) };
          }
          if (operation === "createMany" && Array.isArray(a.data)) {
            a.data = a.data.map((row: Record<string, unknown>) => ({ organizationId: orgId, ...row }));
          }
          return query(args);
        },
      },
    },
  });
}

// Helper for the "I need to override the cookie inside a single request"
// case (e.g. cross-org lookups for superusers in /admin/users). The
// extension still picks the cookie up unless callers explicitly call this
// without a cookie set — for now we don't ship a bypass.

// Reusing the same client across hot reloads in dev avoids exhausting the
// connection pool. The cast keeps the extended client's inferred type
// available to callers (Prisma extension types are wider than PrismaClient).
export const prisma =
   
  (globalForPrisma.prisma as any) ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
   
  globalForPrisma.prisma = prisma as any;
}
