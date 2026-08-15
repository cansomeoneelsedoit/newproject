import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Crown } from "lucide-react";

import { getHive } from "@/server/kronos";
import { colonyHealth, formatKg, inspectionDue, queenAge, round } from "@/lib/kronos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HealthBadge, hiveTypeLabel } from "@/components/kronos/health-badge";
import {
  HiveStatusControl,
  InspectionHistory,
  LogInspectionDialog,
  RecordHarvestDialog,
  type InspectionRow,
} from "./hive-detail-actions";

export const dynamic = "force-dynamic";

export default async function HiveDetailPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hive = await getHive(id);
  if (!hive) notFound();

  const now = new Date();
  const latest = hive.inspections[0] ?? null;
  const health = latest ? colonyHealth(latest) : null;
  const due = inspectionDue(latest?.inspectedAt ?? null, now, hive.status);
  const queen = queenAge(hive.queenYear, now);
  const totalHoney = round(
    hive.harvests.reduce((sum: number, h: { honeyKg: number }) => sum + h.honeyKg, 0),
    1,
  );

  const rows: InspectionRow[] = hive.inspections.map(
    (i: (typeof hive.inspections)[number]): InspectionRow => ({
      ...i,
      // Dates cross the server/client boundary as ISO strings so the table can
      // render them in the viewer's locale.
      inspectedAt: i.inspectedAt.toISOString(),
    }),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/hives" className="hover:underline">Hives</Link>
            {" / "}
            <Link href={`/apiaries/${hive.apiary.id}`} className="hover:underline">
              {hive.apiary.name}
            </Link>
          </div>
          <h1 className="font-serif text-3xl">{hive.name}</h1>
          <p className="text-sm text-muted-foreground">
            {hiveTypeLabel(hive.type)} · installed {hive.installedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HiveStatusControl hiveId={hive.id} status={hive.status} />
          <RecordHarvestDialog hiveId={hive.id} hiveName={hive.name} />
          <LogInspectionDialog hiveId={hive.id} hiveName={hive.name} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Health</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <HealthBadge band={health?.band ?? null} score={health?.score} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Last inspected</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">
            {due.daysSince === null ? "—" : `${due.daysSince}d`}
            {due.due ? (
              <Badge variant="outline" className="ml-2 gap-1 border-amber-500 align-middle text-amber-600">
                <AlertTriangle className="h-3 w-3" /> due
              </Badge>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Queen</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-semibold tabular-nums">
              {hive.queenYear ?? "—"}
            </div>
            {queen.shouldRequeen ? (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <Crown className="h-3 w-3" /> {queen.years} seasons — requeen
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{hive.queenSource ?? "Source unrecorded"}</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Honey lifetime</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">
            {formatKg(totalHoney)}
          </CardContent>
        </Card>
      </div>

      {health && health.flags.length > 0 ? (
        <Card className="border-amber-500/50">
          <CardHeader><CardTitle className="text-base">Flags from the last inspection</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {health.flags.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Inspections ({hive.inspections.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <InspectionHistory rows={rows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Harvests ({hive.harvests.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {hive.harvests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nothing harvested from this colony yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Honey</TableHead>
                  <TableHead className="text-right">Wax</TableHead>
                  <TableHead className="text-right">Frames</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hive.harvests.map((h: (typeof hive.harvests)[number]) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.harvestedAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(h.honeyKg)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {h.waxKg > 0 ? formatKg(h.waxKg) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{h.frames ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {hive.notes ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-sm text-muted-foreground">{hive.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
