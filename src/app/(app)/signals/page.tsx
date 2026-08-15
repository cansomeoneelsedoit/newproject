import Link from "next/link";

import { computeLiveSignals, listStrategies } from "@/server/kronos";
import { formatMoney, round } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SideBadge, strategyLabel } from "@/components/kronos/badges";
import { RatioBar } from "@/components/kronos/charts";
import {
  CreateStrategyDialog,
  DeleteStrategyButton,
  RefreshSignalsButton,
} from "./signal-actions";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const [signals, strategies] = await Promise.all([computeLiveSignals(), listStrategies()]);
  const actionable = signals.filter((s) => s.side !== "FLAT");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Signals</h1>
          <p className="text-sm text-muted-foreground">
            Every watched instrument evaluated against every strategy, recomputed on load.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateStrategyDialog />
          <RefreshSignalsButton />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            Actionable now ({actionable.length} of {signals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {signals.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nothing to evaluate yet — add at least one watched instrument and one strategy.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead className="w-40">Conviction</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((s) => (
                  <TableRow key={`${s.instrument.id}-${s.strategy.id}`}>
                    <TableCell className="font-medium">
                      <Link href={`/instruments/${s.instrument.id}`} className="hover:underline">
                        {s.instrument.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.strategy.name}
                      <span className="ml-1.5 text-xs">({strategyLabel(s.strategy.kind)})</span>
                    </TableCell>
                    <TableCell><SideBadge side={s.side} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <RatioBar pct={s.strength * 100} className="w-20" />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {round(s.strength * 100, 0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(s.price)}
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-xs text-muted-foreground">
                      {s.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Strategies ({strategies.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {strategies.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No strategies configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategies.map((s: (typeof strategies)[number]) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{strategyLabel(s.kind)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {JSON.stringify(s.params)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {s.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteStrategyButton id={s.id} name={s.name} />
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
