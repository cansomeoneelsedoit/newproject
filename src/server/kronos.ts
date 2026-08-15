import { prisma } from "@/server/prisma";
import { requireActiveOrgId } from "@/server/org";
import type { Candle } from "@/lib/indicators";
import { latestSignal, type StrategyKind } from "@/lib/strategies";
import { accountEquity, unrealizedPnl, type Position as PositionState } from "@/lib/portfolio";
import { round } from "@/lib/format";

/**
 * Read side of the Kronos domain.
 *
 * Every query names `organizationId` explicitly from `requireActiveOrgId()`,
 * which verifies the caller's membership. The client extension in
 * src/lib/prisma.ts also injects a scope from the cookie but defers to an
 * explicit value — see the comment there for why that ordering matters.
 *
 * These models are org-scoped, so reads use `findFirst`, never `findUnique`:
 * `findUnique` only accepts unique filters and rejects the injected column.
 */

export type InstrumentRow = {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  currency: string;
  watched: boolean;
  candleCount: number;
  lastClose: number | null;
  lastTs: Date | null;
  changePct: number | null;
};

export async function listInstruments(): Promise<InstrumentRow[]> {
  const organizationId = await requireActiveOrgId();
  const instruments = await prisma.instrument.findMany({
    where: { organizationId },
    orderBy: { symbol: "asc" },
    select: {
      id: true,
      symbol: true,
      name: true,
      assetClass: true,
      currency: true,
      watched: true,
      _count: { select: { candles: true } },
      candles: {
        orderBy: { ts: "desc" },
        take: 2,
        select: { ts: true, close: true },
      },
    },
  });

  type Row = (typeof instruments)[number];
  return instruments.map((i: Row) => {
    const [latest, prior] = i.candles;
    return {
      id: i.id,
      symbol: i.symbol,
      name: i.name,
      assetClass: i.assetClass,
      currency: i.currency,
      watched: i.watched,
      candleCount: i._count.candles,
      lastClose: latest ? round(latest.close, 4) : null,
      lastTs: latest?.ts ?? null,
      changePct:
        latest && prior && prior.close !== 0
          ? round(((latest.close - prior.close) / prior.close) * 100, 2)
          : null,
    };
  });
}

export async function getInstrument(id: string) {
  const organizationId = await requireActiveOrgId();
  return prisma.instrument.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      symbol: true,
      name: true,
      assetClass: true,
      exchange: true,
      currency: true,
      watched: true,
    },
  });
}

/** Candles for one instrument, oldest first — the order every indicator expects. */
export async function getCandles(instrumentId: string, limit = 400): Promise<Candle[]> {
  const organizationId = await requireActiveOrgId();
  const rows = await prisma.candle.findMany({
    where: { organizationId, instrumentId },
    orderBy: { ts: "desc" },
    take: limit,
    select: { ts: true, open: true, high: true, low: true, close: true, volume: true },
  });
  return rows.reverse();
}

export async function listStrategies() {
  const organizationId = await requireActiveOrgId();
  return prisma.strategy.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, params: true, notes: true },
  });
}

export async function getStrategy(id: string) {
  const organizationId = await requireActiveOrgId();
  return prisma.strategy.findFirst({
    where: { id, organizationId },
    select: { id: true, name: true, kind: true, params: true, notes: true },
  });
}

export type SignalRow = {
  id: string;
  ts: Date;
  side: string;
  strength: number;
  price: number;
  reason: string;
  instrument: { id: string; symbol: string; name: string };
  strategy: { id: string; name: string; kind: string };
};

export async function listSignals(limit = 200): Promise<SignalRow[]> {
  const organizationId = await requireActiveOrgId();
  return prisma.signal.findMany({
    where: { organizationId },
    orderBy: [{ ts: "desc" }, { strength: "desc" }],
    take: limit,
    select: {
      id: true,
      ts: true,
      side: true,
      strength: true,
      price: true,
      reason: true,
      instrument: { select: { id: true, symbol: true, name: true } },
      strategy: { select: { id: true, name: true, kind: true } },
    },
  });
}

/**
 * Evaluate every watched instrument against every strategy, in memory.
 *
 * This is the "what would I do right now" view. It deliberately does not read
 * the persisted Signal rows — those are the audit trail of past refreshes,
 * whereas this recomputes from current candles so the page is never stale.
 */
export async function computeLiveSignals(): Promise<
  {
    instrument: { id: string; symbol: string; name: string };
    strategy: { id: string; name: string; kind: string };
    side: string;
    strength: number;
    price: number;
    reason: string;
    ts: Date;
  }[]
> {
  const organizationId = await requireActiveOrgId();
  const [instruments, strategies] = await Promise.all([
    prisma.instrument.findMany({
      where: { organizationId, watched: true },
      orderBy: { symbol: "asc" },
      select: { id: true, symbol: true, name: true },
    }),
    listStrategies(),
  ]);

  const out: Awaited<ReturnType<typeof computeLiveSignals>> = [];

  for (const instrument of instruments) {
    const candles = await getCandles(instrument.id);
    if (candles.length === 0) continue;

    for (const strategy of strategies) {
      const signal = latestSignal(
        strategy.kind as StrategyKind,
        candles,
        strategy.params,
      );
      if (!signal) continue;
      out.push({
        instrument,
        strategy: { id: strategy.id, name: strategy.name, kind: strategy.kind },
        side: signal.target > 0 ? "BUY" : signal.target < 0 ? "SELL" : "FLAT",
        strength: round(signal.strength, 3),
        price: round(signal.price, 4),
        reason: signal.reason,
        ts: signal.ts,
      });
    }
  }

  // Actionable signals first, then by conviction.
  return out.sort((a, b) => {
    const rank = (s: string) => (s === "FLAT" ? 1 : 0);
    if (rank(a.side) !== rank(b.side)) return rank(a.side) - rank(b.side);
    return b.strength - a.strength;
  });
}

export async function listBacktests(limit = 50) {
  const organizationId = await requireActiveOrgId();
  return prisma.backtest.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      from: true,
      to: true,
      initialCash: true,
      finalEquity: true,
      totalReturnPct: true,
      cagrPct: true,
      maxDrawdownPct: true,
      sharpe: true,
      winRatePct: true,
      profitFactor: true,
      tradeCount: true,
      createdAt: true,
      instrument: { select: { id: true, symbol: true } },
      strategy: { select: { id: true, name: true, kind: true } },
    },
  });
}

export async function getBacktest(id: string) {
  const organizationId = await requireActiveOrgId();
  return prisma.backtest.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      from: true,
      to: true,
      initialCash: true,
      commissionBps: true,
      slippageBps: true,
      finalEquity: true,
      totalReturnPct: true,
      cagrPct: true,
      maxDrawdownPct: true,
      sharpe: true,
      winRatePct: true,
      profitFactor: true,
      tradeCount: true,
      equityCurve: true,
      createdAt: true,
      instrument: { select: { id: true, symbol: true, name: true, currency: true } },
      strategy: { select: { id: true, name: true, kind: true, params: true } },
      trades: {
        orderBy: { entryTs: "asc" },
        select: {
          id: true,
          side: true,
          quantity: true,
          entryTs: true,
          entryPrice: true,
          exitTs: true,
          exitPrice: true,
          pnl: true,
          returnPct: true,
          exitReason: true,
        },
      },
    },
  });
}

export type PortfolioPosition = {
  id: string;
  instrument: { id: string; symbol: string; name: string; currency: string };
  quantity: number;
  avgCost: number;
  realizedPnl: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
};

export type AccountView = {
  id: string;
  name: string;
  currency: string;
  startingCash: number;
  cash: number;
  positions: PortfolioPosition[];
  equity: number;
  totalPnl: number;
  totalReturnPct: number;
  openOrders: number;
};

export async function listAccounts(): Promise<AccountView[]> {
  const organizationId = await requireActiveOrgId();
  const accounts = await prisma.account_.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      currency: true,
      startingCash: true,
      cash: true,
      positions: {
        select: {
          id: true,
          quantity: true,
          avgCost: true,
          realizedPnl: true,
          instrument: {
            select: {
              id: true,
              symbol: true,
              name: true,
              currency: true,
              candles: { orderBy: { ts: "desc" }, take: 1, select: { close: true } },
            },
          },
        },
      },
      _count: { select: { orders: true } },
    },
  });

  type Row = (typeof accounts)[number];
  type PosRow = Row["positions"][number];

  return accounts.map((a: Row) => {
    const positions: PortfolioPosition[] = a.positions
      // A closed position is kept as a zero-quantity row so realised P&L
      // survives; it should not clutter the holdings table.
      .filter((p: PosRow) => p.quantity !== 0)
      .map((p: PosRow) => {
        const lastPrice = p.instrument.candles[0]?.close ?? p.avgCost;
        const state: PositionState = {
          quantity: p.quantity,
          avgCost: p.avgCost,
          realizedPnl: p.realizedPnl,
        };
        const unreal = unrealizedPnl(state, lastPrice);
        const cost = Math.abs(p.quantity * p.avgCost);
        return {
          id: p.id,
          instrument: {
            id: p.instrument.id,
            symbol: p.instrument.symbol,
            name: p.instrument.name,
            currency: p.instrument.currency,
          },
          quantity: p.quantity,
          avgCost: round(p.avgCost, 4),
          realizedPnl: round(p.realizedPnl, 2),
          lastPrice: round(lastPrice, 4),
          marketValue: round(p.quantity * lastPrice, 2),
          unrealizedPnl: round(unreal, 2),
          unrealizedPct: cost === 0 ? 0 : round((unreal / cost) * 100, 2),
        };
      });

    const equity = accountEquity(
      a.cash,
      positions.map((p) => ({
        position: { quantity: p.quantity, avgCost: p.avgCost, realizedPnl: p.realizedPnl },
        price: p.lastPrice,
      })),
    );

    const realized = a.positions.reduce((sum: number, p: PosRow) => sum + p.realizedPnl, 0);
    const unrealized = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    return {
      id: a.id,
      name: a.name,
      currency: a.currency,
      startingCash: round(a.startingCash, 2),
      cash: round(a.cash, 2),
      positions,
      equity: round(equity, 2),
      totalPnl: round(realized + unrealized, 2),
      totalReturnPct:
        a.startingCash === 0 ? 0 : round(((equity - a.startingCash) / a.startingCash) * 100, 2),
      openOrders: a._count.orders,
    };
  });
}

export async function getAccount(id: string): Promise<AccountView | null> {
  const all = await listAccounts();
  return all.find((a) => a.id === id) ?? null;
}

export async function listOrders(accountId?: string, limit = 100) {
  const organizationId = await requireActiveOrgId();
  return prisma.order_.findMany({
    where: { organizationId, ...(accountId ? { accountId } : {}) },
    orderBy: { placedAt: "desc" },
    take: limit,
    select: {
      id: true,
      side: true,
      type: true,
      quantity: true,
      limitPrice: true,
      status: true,
      filledPrice: true,
      filledAt: true,
      note: true,
      placedAt: true,
      account: { select: { id: true, name: true } },
      instrument: { select: { id: true, symbol: true, currency: true } },
    },
  });
}

export type AnalysisRow = {
  id: string;
  model: string;
  headline: string;
  content: string;
  createdAt: Date;
  instrument: { id: string; symbol: string };
};

export async function listAnalyses(
  instrumentId?: string,
  limit = 20,
): Promise<AnalysisRow[]> {
  const organizationId = await requireActiveOrgId();
  return prisma.aiAnalysis.findMany({
    where: { organizationId, ...(instrumentId ? { instrumentId } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      model: true,
      headline: true,
      content: true,
      createdAt: true,
      instrument: { select: { id: true, symbol: true } },
    },
  });
}

export type Dashboard = {
  instruments: number;
  strategies: number;
  actionableSignals: number;
  backtests: number;
  accounts: AccountView[];
  topSignals: Awaited<ReturnType<typeof computeLiveSignals>>;
  recentBacktests: Awaited<ReturnType<typeof listBacktests>>;
  latestAnalysis: Awaited<ReturnType<typeof listAnalyses>>[number] | null;
};

export async function getDashboard(): Promise<Dashboard> {
  const organizationId = await requireActiveOrgId();

  const [instruments, strategies, backtests, accounts, signals, recentBacktests, analyses] =
    await Promise.all([
      prisma.instrument.count({ where: { organizationId } }),
      prisma.strategy.count({ where: { organizationId } }),
      prisma.backtest.count({ where: { organizationId } }),
      listAccounts(),
      computeLiveSignals(),
      listBacktests(5),
      listAnalyses(undefined, 1),
    ]);

  return {
    instruments,
    strategies,
    backtests,
    accounts,
    actionableSignals: signals.filter((s) => s.side !== "FLAT").length,
    topSignals: signals.filter((s) => s.side !== "FLAT").slice(0, 8),
    recentBacktests,
    latestAnalysis: analyses[0] ?? null,
  };
}
