import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, MapPin } from "lucide-react";

import { getApiary, listApiaryOptions, listHives } from "@/server/kronos";
import { formatKg } from "@/lib/kronos";
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
import { HealthBadge, StatusBadge, hiveTypeLabel } from "@/components/kronos/health-badge";
import { CreateHiveDialog } from "../../hives/hive-dialogs";

export const dynamic = "force-dynamic";

export default async function ApiaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [apiary, apiaries] = await Promise.all([getApiary(id), listApiaryOptions()]);
  if (!apiary) notFound();

  const hives = await listHives({ apiaryId: apiary.id });
  const totalHoney = hives.reduce((sum, h) => sum + h.honeyKg, 0);
  const dueCount = hives.filter((h) => h.due.due).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/apiaries" className="hover:underline">Apiaries</Link>
          </div>
          <h1 className="font-serif text-3xl">{apiary.name}</h1>
          {apiary.location ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {apiary.location}
              {apiary.latitude !== null && apiary.longitude !== null ? (
                <span className="font-mono text-xs">
                  ({apiary.latitude.toFixed(4)}, {apiary.longitude.toFixed(4)})
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <CreateHiveDialog apiaries={apiaries} defaultApiaryId={apiary.id} />
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Colonies</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">{hives.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Due a visit</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">{dueCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Honey lifetime</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">{formatKg(totalHoney)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Hives here ({hives.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {hives.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No hives at this apiary yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hive</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Last inspected</TableHead>
                  <TableHead className="text-right">Honey</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hives.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">
                      <Link href={`/hives/${h.id}`} className="hover:underline">{h.name}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{hiveTypeLabel(h.type)}</TableCell>
                    <TableCell><StatusBadge status={h.status} /></TableCell>
                    <TableCell>
                      <HealthBadge band={h.health?.band ?? null} score={h.health?.score} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.due.daysSince === null ? "Never" : `${h.due.daysSince}d ago`}
                      {h.due.due ? (
                        <Badge variant="outline" className="ml-2 gap-1 border-amber-500 text-amber-600">
                          <AlertTriangle className="h-3 w-3" /> due
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {h.honeyKg > 0 ? formatKg(h.honeyKg) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {apiary.notes ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-sm text-muted-foreground">{apiary.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
