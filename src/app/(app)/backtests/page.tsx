import Link from "next/link";

import { listBacktests, listInstruments, listStrategies } from "@/server/kronos";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pnl, strategyLabel } from "@/components/kronos/badges";
import { VerdictBadge } from "@/components/kronos/verdict";
import { DeleteBacktestButton, RunBacktestDialog } from "./backtest-actions";

export const dynamic = "force-dynamic";

export default async function BacktestsPage() {
  const [backtests, instruments, strategies] = await Promise.all([
    listBacktests(),
    listInstruments(),
    listStrategies(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Backtests</h1>
          <p className="text-sm text-muted-foreground">
            Every run is scored on a held-out period and across walk-forward windows.
            A green in-sample number alone is not a result.
          </p>
        </div>
        <RunBacktestDialog
          instruments={instruments.map((i) => ({ id: i.id, symbol: i.symbol }))}
          strategies={strategies.map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          }))}
        />
      </header>

      <Card>
        <CardHeader><CardTitle>Runs ({backtests.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {backtests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No backtests yet. Run one to see how a strategy would have performed.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead className="text-right">In-sample</TableHead>
                  <TableHead className="text-right">Holdout</TableHead>
                  <TableHead className="text-right">Max DD</TableHead>
                  <TableHead className="text-right">Sharpe</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {backtests.map((b: (typeof backtests)[number]) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <Link href={`/backtests/${b.id}`} className="hover:underline">
                        {b.instrument.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.strategy.name}
                      <span className="ml-1.5 text-xs">({strategyLabel(b.strategy.kind)})</span>
                    </TableCell>
                    <TableCell><VerdictBadge accepted={b.accepted} /></TableCell>
                    <TableCell className="text-right"><Pnl value={b.totalReturnPct} pct /></TableCell>
                    <TableCell className="text-right"><Pnl value={b.oosReturnPct} pct /></TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      −{b.maxDrawdownPct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.sharpe.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {b.winRatePct.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {b.tradeCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.finalEquity)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteBacktestButton id={b.id} />
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
