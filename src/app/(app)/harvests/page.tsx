import Link from "next/link";

import { listHarvests } from "@/server/kronos";
import { formatKg, round } from "@/lib/kronos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function HarvestsPage() {
  const harvests = await listHarvests();

  const totalHoney = round(
    harvests.reduce((sum: number, h: { honeyKg: number }) => sum + h.honeyKg, 0),
    1,
  );
  const totalWax = round(
    harvests.reduce((sum: number, h: { waxKg: number }) => sum + h.waxKg, 0),
    1,
  );

  // Group by calendar year so a multi-season operation can see the trend.
  const byYear = new Map<number, number>();
  for (const h of harvests) {
    const y = h.harvestedAt.getUTCFullYear();
    byYear.set(y, round((byYear.get(y) ?? 0) + h.honeyKg, 1));
  }
  const years = [...byYear.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">Harvests</h1>
        <p className="text-sm text-muted-foreground">
          Every pull, across every colony. Record one from a hive&apos;s page.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Honey all-time</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">{formatKg(totalHoney)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Wax all-time</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">{formatKg(totalWax)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pulls recorded</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">{harvests.length}</CardContent>
        </Card>
      </div>

      {years.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">By season</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {years.map(([year, kg]) => {
              const max = Math.max(...years.map(([, v]) => v));
              const pct = max > 0 ? Math.round((kg / max) * 100) : 0;
              return (
                <div key={year} className="flex items-center gap-3 text-sm">
                  <span className="w-12 tabular-nums text-muted-foreground">{year}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right tabular-nums">{formatKg(kg)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>All harvests ({harvests.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {harvests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nothing harvested yet. Open a hive and use &ldquo;Record harvest&rdquo;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hive</TableHead>
                  <TableHead>Apiary</TableHead>
                  <TableHead className="text-right">Honey</TableHead>
                  <TableHead className="text-right">Wax</TableHead>
                  <TableHead className="text-right">Frames</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {harvests.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {h.harvestedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/hives/${h.hive.id}`} className="hover:underline">{h.hive.name}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{h.hive.apiary.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(h.honeyKg)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {h.waxKg > 0 ? formatKg(h.waxKg) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{h.frames ?? "—"}</TableCell>
                    <TableCell className="max-w-[18rem] truncate text-xs text-muted-foreground">
                      {h.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
