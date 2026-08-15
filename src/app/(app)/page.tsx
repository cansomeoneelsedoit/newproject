import Link from "next/link";

import { prisma } from "@/server/prisma";
import { getActiveOrgId } from "@/server/org";
import { getDashboard } from "@/server/kronos";
import { activeProvider } from "@/server/market-data";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineBadge, Pnl, SideBadge, strategyLabel } from "@/components/kronos/badges";

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
  const provider = activeProvider();
  const book = stats.accounts[0] ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">{org?.name ?? "Kronos"}</h1>
        <p className="text-sm text-muted-foreground">
          Signals, backtests, and paper P&amp;L across the desk.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Actionable signals"
          value={String(stats.actionableSignals)}
          hint={stats.actionableSignals > 0 ? "long or short right now" : "everything flat"}
          href="/signals"
          emphasise={stats.actionableSignals > 0}
        />
        <StatCard label="Instruments" value={String(stats.instruments)} hint={`${stats.strategies} strategies`} href="/instruments" />
        <StatCard label="Backtests run" value={String(stats.backtests)} href="/backtests" />
        <StatCard
          label={book ? `${book.name} equity` : "Paper equity"}
          value={book ? formatMoney(book.equity, book.currency) : "—"}
          hint={book ? `${book.totalReturnPct >= 0 ? "+" : ""}${book.totalReturnPct}% since open` : "no account yet"}
          href="/portfolio"
        />
      </div>

      {provider === "synthetic" ? (
        <Card className="border-amber-500/50">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Running on simulated prices.</strong> No
            market-data credentials are configured, so every number below is computed from
            deterministic synthetic series. The machinery is real; the market is not.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Top signals</CardTitle></CardHeader>
        <CardContent className="p-0">
          {stats.topSignals.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nothing actionable. Add instruments and strategies, and they will be evaluated here.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.topSignals.map((s) => (
                <li
                  key={`${s.instrument.id}-${s.strategy.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <Link
                    href={`/instruments/${s.instrument.id}`}
                    className="min-w-20 font-medium hover:underline"
                  >
                    {s.instrument.symbol}
                  </Link>
                  <SideBadge side={s.side} />
                  <span className="text-xs text-muted-foreground">
                    {s.strategy.name} · {strategyLabel(s.strategy.kind)}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(s.strength * 100)}% conviction
                  </span>
                  <span className="ml-auto max-w-md truncate text-xs text-muted-foreground">
                    {s.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent backtests</CardTitle></CardHeader>
          <CardContent className="p-0">
            {stats.recentBacktests.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No backtests yet.</p>
            ) : (
              <ul className="divide-y">
                {stats.recentBacktests.map((b: (typeof stats.recentBacktests)[number]) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <Link href={`/backtests/${b.id}`} className="font-medium hover:underline">
                      {b.instrument.symbol}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">{b.strategy.name}</span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      DD −{b.maxDrawdownPct.toFixed(0)}%
                    </span>
                    <Pnl value={b.totalReturnPct} pct className="w-20 text-right" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Latest analysis</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {stats.latestAnalysis === null ? (
              <p className="text-sm text-muted-foreground">
                No analysis yet. Open an instrument and use Analyse.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/instruments/${stats.latestAnalysis.instrument.id}`}
                    className="font-medium hover:underline"
                  >
                    {stats.latestAnalysis.instrument.symbol}
                  </Link>
                  <EngineBadge model={stats.latestAnalysis.model} />
                </div>
                <p className="text-sm font-medium">{stats.latestAnalysis.headline}</p>
                <p className="line-clamp-4 text-sm text-muted-foreground">
                  {stats.latestAnalysis.content.split("\n\n")[0]}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
