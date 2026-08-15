import Link from "next/link";
import { notFound } from "next/navigation";

import { getBacktest, getCandles } from "@/server/kronos";
import { buyAndHold } from "@/lib/backtest";
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
import { EquityChart, RatioBar, type CurvePoint } from "@/components/kronos/charts";
import { Pnl, SideBadge, strategyLabel } from "@/components/kronos/badges";

export const dynamic = "force-dynamic";

export default async function BacktestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bt = await getBacktest(id);
  if (!bt) notFound();

  // The stored curve is JSON; validate its shape rather than trusting the cast.
  const raw: unknown[] = Array.isArray(bt.equityCurve) ? (bt.equityCurve as unknown[]) : [];
  const curve: CurvePoint[] = raw
    .filter(
      (p: unknown): p is { ts: string; equity: number } =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as { ts?: unknown }).ts === "string" &&
        typeof (p as { equity?: unknown }).equity === "number",
    )
    .map((p: { ts: string; equity: number }) => ({ ts: p.ts, equity: p.equity }));

  // Buy-and-hold over the same window, so the strategy is judged against the
  // cheapest possible alternative rather than against zero.
  const candles = await getCandles(bt.instrument.id, 2000);
  const windowed = candles.filter(
    (c) => c.ts >= bt.from && c.ts <= bt.to,
  );
  const benchmark: CurvePoint[] = buyAndHold(windowed, bt.initialCash).map((p) => ({
    ts: p.ts.toISOString(),
    equity: round(p.equity, 2),
  }));
  const benchReturn =
    benchmark.length > 1 && benchmark[0].equity !== 0
      ? ((benchmark[benchmark.length - 1].equity - benchmark[0].equity) / benchmark[0].equity) * 100
      : 0;

  const currency = bt.instrument.currency;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-sm text-muted-foreground">
          <Link href="/backtests" className="hover:underline">Backtests</Link>
        </div>
        <h1 className="font-serif text-3xl">
          {bt.strategy.name} on {bt.instrument.symbol}
        </h1>
        <p className="text-sm text-muted-foreground">
          {strategyLabel(bt.strategy.kind)} · {bt.from.toLocaleDateString()} –{" "}
          {bt.to.toLocaleDateString()} · {formatMoney(bt.initialCash, currency)} start ·{" "}
          {bt.commissionBps} bps commission, {bt.slippageBps} bps slippage
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total return" pnl={bt.totalReturnPct} />
        <Stat label="CAGR" pnl={bt.cagrPct} />
        <Stat label="Max drawdown" value={`−${bt.maxDrawdownPct.toFixed(1)}%`} />
        <Stat label="Sharpe" value={bt.sharpe.toFixed(2)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equity curve vs buy &amp; hold</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <EquityChart curve={curve} benchmark={benchmark} />
          <p className="mt-3 text-sm text-muted-foreground">
            Strategy returned <Pnl value={bt.totalReturnPct} pct /> against buy &amp; hold&apos;s{" "}
            <Pnl value={benchReturn} pct />
            {bt.totalReturnPct > benchReturn
              ? " — the strategy beat simply holding it."
              : " — simply holding it would have done better."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            <div className="text-2xl font-semibold tabular-nums">
              {bt.winRatePct.toFixed(0)}%
            </div>
            <RatioBar pct={bt.winRatePct} />
            <p className="text-xs text-muted-foreground">{bt.tradeCount} closed trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit factor</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-semibold tabular-nums">
              {bt.profitFactor >= 9999 ? "∞" : bt.profitFactor.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Gross profit ÷ gross loss</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Final equity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-semibold tabular-nums">
              {formatMoney(bt.finalEquity, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              from {formatMoney(bt.initialCash, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Trades ({bt.trades.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {bt.trades.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              This strategy never opened a position over the tested window.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Side</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead className="text-right">Entry px</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead className="text-right">Exit px</TableHead>
                  <TableHead className="text-right">P&amp;L</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                  <TableHead>Closed by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bt.trades.map((t: (typeof bt.trades)[number]) => (
                  <TableRow key={t.id}>
                    <TableCell><SideBadge side={t.side} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {t.entryTs.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(t.entryPrice, currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {t.exitTs ? t.exitTs.toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.exitPrice === null ? "—" : formatMoney(t.exitPrice, currency)}
                    </TableCell>
                    <TableCell className="text-right"><Pnl value={t.pnl} /></TableCell>
                    <TableCell className="text-right"><Pnl value={t.returnPct} pct /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.exitReason ?? "—"}
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

function Stat({ label, value, pnl }: { label: string; value?: string; pnl?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">
        {pnl === undefined ? value : <Pnl value={pnl} pct />}
      </CardContent>
    </Card>
  );
}
