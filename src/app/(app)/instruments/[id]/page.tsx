import Link from "next/link";
import { notFound } from "next/navigation";

import { getCandles, getInstrument, listAnalyses, listStrategies } from "@/server/kronos";
import { activeProvider } from "@/server/market-data";
import { buildSnapshot, aiEnabled } from "@/server/ai";
import { latestSignal, type StrategyKind } from "@/lib/strategies";
import { formatMoney, formatPct, round } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EquityChart } from "@/components/kronos/charts";
import { EngineBadge, Pnl, SideBadge, assetClassLabel, strategyLabel } from "@/components/kronos/badges";
import { AnalyseButton, SyncButton } from "../instrument-dialogs";

export const dynamic = "force-dynamic";

export default async function InstrumentDetailPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const instrument = await getInstrument(id);
  if (!instrument) notFound();

  const [candles, strategies, analyses] = await Promise.all([
    getCandles(id),
    listStrategies(),
    listAnalyses(id, 5),
  ]);

  const provider = activeProvider();
  const snapshot =
    candles.length > 0
      ? buildSnapshot(
          {
            symbol: instrument.symbol,
            name: instrument.name,
            provider,
            synthetic: provider === "synthetic",
          },
          candles,
        )
      : null;

  const signals = strategies
    .map((s: { id: string; name: string; kind: string; params: unknown }) => {
      const sig = latestSignal(s.kind as StrategyKind, candles, s.params);
      return sig ? { strategy: s, signal: sig } : null;
    })
    .filter(Boolean) as {
    strategy: { id: string; name: string; kind: string };
    signal: ReturnType<typeof latestSignal>;
  }[];

  const priceCurve = candles.map((c) => ({ ts: c.ts.toISOString(), equity: c.close }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/instruments" className="hover:underline">Instruments</Link>
          </div>
          <h1 className="font-serif text-3xl">
            {instrument.symbol}
            <span className="ml-3 align-middle text-base font-normal text-muted-foreground">
              {instrument.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {assetClassLabel(instrument.assetClass)} · {instrument.currency} · {candles.length} bars
            {provider === "synthetic" ? " · simulated prices" : ` · via ${provider}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncButton instrumentId={instrument.id} label="Sync prices" />
          <AnalyseButton instrumentId={instrument.id} />
        </div>
      </header>

      {snapshot ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Last" value={formatMoney(snapshot.lastClose, instrument.currency)} />
          <Stat
            label="20-day change"
            value={snapshot.changePct20d === null ? "—" : formatPct(snapshot.changePct20d)}
            tone={snapshot.changePct20d ?? 0}
          />
          <Stat label="RSI (14)" value={snapshot.rsi14 === null ? "—" : String(snapshot.rsi14)} />
          <Stat
            label="ATR % of price"
            value={snapshot.atrPctOfPrice === null ? "—" : `${snapshot.atrPctOfPrice}%`}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-base">Price</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <EquityChart curve={priceCurve} height={220} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current strategy reads ({signals.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {signals.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No strategies configured yet, or not enough history to evaluate them.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead className="text-right">Conviction</TableHead>
                  <TableHead>Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map(({ strategy, signal }) => (
                  <TableRow key={strategy.id}>
                    <TableCell className="font-medium">{strategy.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {strategyLabel(strategy.kind)}
                    </TableCell>
                    <TableCell>
                      <SideBadge
                        side={signal!.target > 0 ? "BUY" : signal!.target < 0 ? "SELL" : "FLAT"}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {round(signal!.strength * 100, 0)}%
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground">
                      {signal!.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          {analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No analysis yet. {aiEnabled()
                ? "Use Analyse to have Claude read the current setup."
                : "No ANTHROPIC_API_KEY is set, so Analyse will use the built-in rule-based writer."}
            </p>
          ) : (
            analyses.map((a) => (
              <article key={a.id} className="rounded-md border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{a.headline}</h3>
                  <EngineBadge model={a.model} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {a.createdAt.toLocaleString()}
                  </span>
                </div>
                {a.content.split("\n\n").map((p, i) => (
                  <p key={i} className="mb-2 text-sm leading-relaxed text-muted-foreground last:mb-0">
                    {p}
                  </p>
                ))}
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {tone === undefined ? (
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        ) : (
          <div className="text-2xl font-semibold">
            <Pnl value={tone} pct />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
