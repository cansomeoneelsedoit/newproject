import Link from "next/link";
import { AlertTriangle, Crown } from "lucide-react";

import { prisma } from "@/server/prisma";
import { getActiveOrgId } from "@/server/org";
import { getDashboard } from "@/server/kronos";
import { formatKg } from "@/lib/kronos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthBadge, StatusBadge } from "@/components/kronos/health-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const activeOrgId = await getActiveOrgId();
  const org = activeOrgId
    ? await prisma.organization.findUnique({
        where: { id: activeOrgId },
        select: { name: true },
      })
    : null;

  const stats = await getDashboard();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">{org?.name ?? "Kronos"}</h1>
        <p className="text-sm text-muted-foreground">
          Colony health across every apiary, newest observations first.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active colonies" value={String(stats.activeHives)} hint={`${stats.totalHives} total`} href="/hives?status=ACTIVE" />
        <StatCard label="Apiaries" value={String(stats.apiaries)} href="/apiaries" />
        <StatCard label="Honey this year" value={formatKg(stats.honeyThisYearKg)} href="/harvests" />
        <StatCard
          label="Due a visit"
          value={String(stats.dueCount)}
          hint={stats.dueCount > 0 ? "inspect soon" : "all up to date"}
          href="/hives"
          emphasise={stats.dueCount > 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.attention.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nothing flagged. Every colony is inspected, healthy, and queenright.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.attention.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link href={`/hives/${h.id}`} className="min-w-32 font-medium hover:underline">
                    {h.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{h.apiary.name}</span>
                  <StatusBadge status={h.status} />
                  <HealthBadge band={h.health?.band ?? null} score={h.health?.score} />
                  {h.due.due ? (
                    <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      {h.due.daysSince === null ? "never inspected" : `${h.due.daysSince}d since visit`}
                    </Badge>
                  ) : null}
                  {h.requeen ? (
                    <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                      <Crown className="h-3 w-3" /> requeen
                    </Badge>
                  ) : null}
                  <span className="ml-auto max-w-md truncate text-xs text-muted-foreground">
                    {h.health?.flags[0] ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent inspections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentInspections.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No inspections logged yet. Open a hive and record your first visit.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.recentInspections.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                    {i.inspectedAt.toLocaleDateString()}
                  </span>
                  <Link href={`/hives/${i.hive.id}`} className="font-medium hover:underline">
                    {i.hive.name}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">{i.notes ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
  emphasise = false,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  emphasise?: boolean;
}) {
  return (
    <Link href={href} className="block transition-colors hover:bg-accent/5">
      <Card className={emphasise ? "border-amber-500/60" : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
