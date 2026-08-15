import Link from "next/link";
import { AlertTriangle, Crown } from "lucide-react";

import { listApiaryOptions, listHives } from "@/server/kronos";
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
import { CreateHiveDialog } from "./hive-dialogs";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "QUEENLESS", label: "Queenless" },
  { value: "SWARMED", label: "Swarmed" },
  { value: "DEAD", label: "Dead" },
  { value: "SOLD", label: "Sold" },
];

export default async function HivesPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus = STATUS_FILTERS.some((f) => f.value === status && f.value !== "") ? status : undefined;

  const [hives, apiaries] = await Promise.all([
    listHives({ status: validStatus }),
    listApiaryOptions(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Hives</h1>
          <p className="text-sm text-muted-foreground">
            Every colony, with its health from the most recent inspection.
          </p>
        </div>
        <CreateHiveDialog apiaries={apiaries} />
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = (validStatus ?? "") === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={f.value ? `/hives?status=${f.value}` : "/hives"}
              className={
                active
                  ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                  : "rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent/10"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {validStatus ? `${hiveTypeStatusLabel(validStatus)} hives` : "All hives"} ({hives.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {hives.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {apiaries.length === 0
                ? "Create an apiary, then add your first hive."
                : "No hives match this filter."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hive</TableHead>
                  <TableHead>Apiary</TableHead>
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
                      <Link href={`/hives/${h.id}`} className="hover:underline">
                        {h.name}
                      </Link>
                      {h.requeen ? (
                        <span
                          title="Queen is due replacement"
                          className="ml-2 inline-flex items-center text-amber-600"
                        >
                          <Crown className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link href={`/apiaries/${h.apiary.id}`} className="hover:underline">
                        {h.apiary.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{hiveTypeLabel(h.type)}</TableCell>
                    <TableCell><StatusBadge status={h.status} /></TableCell>
                    <TableCell>
                      <HealthBadge band={h.health?.band ?? null} score={h.health?.score} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.due.daysSince === null ? (
                        <span className="text-xs">Never</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          {h.due.daysSince}d ago
                          {h.due.due ? (
                            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                              <AlertTriangle className="h-3 w-3" /> due
                            </Badge>
                          ) : null}
                        </span>
                      )}
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
    </div>
  );
}

function hiveTypeStatusLabel(status: string): string {
  return STATUS_FILTERS.find((f) => f.value === status)?.label ?? status;
}
