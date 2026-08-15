import { PrismaClient, UserRole, OrgRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { generateCandles } from "../src/lib/synthetic";
import { backtest } from "../src/lib/backtest";
import { latestSignal, type StrategyKind } from "../src/lib/strategies";
import { applyFill, cashDelta, commissionFor, slippedPrice } from "../src/lib/portfolio";

const prisma = new PrismaClient();

/**
 * Idempotent seed for Kronos.
 *
 * Runs on every boot (see `npm run start:prod`), so every write is keyed on a
 * stable business value — never on a generated timestamp, which would make the
 * "already exists" check miss and duplicate the demo data on each deploy.
 *
 * This is a non-request context: the client extension in src/lib/prisma.ts
 * cannot read a cookie here, so every tenant row stamps `organizationId`
 * explicitly. The column is NOT NULL, so a row that forgot to would fail loudly.
 *
 * The prices are generated, not observed — see src/lib/synthetic.ts.
 */

const INSTRUMENTS = [
  { symbol: "AAPL", name: "Apple Inc.", assetClass: "EQUITY" as const, startPrice: 120, drift: 0.14, volatility: 0.26 },
  { symbol: "MSFT", name: "Microsoft Corp.", assetClass: "EQUITY" as const, startPrice: 250, drift: 0.16, volatility: 0.24 },
  { symbol: "NVDA", name: "NVIDIA Corp.", assetClass: "EQUITY" as const, startPrice: 90, drift: 0.35, volatility: 0.55 },
  { symbol: "SPY", name: "S&P 500 ETF", assetClass: "INDEX" as const, startPrice: 400, drift: 0.09, volatility: 0.15 },
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar", assetClass: "CRYPTO" as const, startPrice: 28_000, drift: 0.4, volatility: 0.7 },
  { symbol: "GOLD", name: "Gold Spot", assetClass: "COMMODITY" as const, startPrice: 1_900, drift: 0.06, volatility: 0.14 },
];

const STRATEGIES = [
  {
    name: "Trend 20/50",
    kind: "SMA_CROSSOVER" as const,
    params: { fast: 20, slow: 50, allowShort: false },
    notes: "Classic long-only trend filter. Whipsaws in range-bound tape.",
  },
  {
    name: "Mean reversion 14",
    kind: "RSI_REVERSION" as const,
    params: { period: 14, oversold: 30, overbought: 70, allowShort: false },
    notes: "Buys oversold, exits back through the midline.",
  },
  {
    name: "Breakout 20/10",
    kind: "DONCHIAN_BREAKOUT" as const,
    params: { entryPeriod: 20, exitPeriod: 10, allowShort: true },
    notes: "Turtle-style channel breakout, long and short.",
  },
  {
    name: "MACD trend",
    kind: "MACD_TREND" as const,
    params: { fast: 12, slow: 26, signal: 9, allowShort: false },
    notes: "Long while MACD leads its signal line.",
  },
];

const BARS = 400;

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "kronos" },
    update: { name: "Kronos Capital" },
    create: { name: "Kronos Capital", slug: "kronos" },
  });

  const passwordHash = await bcrypt.hash("devpassword", 10);
  const user = await prisma.user.upsert({
    where: { email: "dev@kronos.local" },
    update: {},
    create: {
      email: "dev@kronos.local",
      name: "Dev User",
      passwordHash,
      role: UserRole.SUPERUSER,
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: OrgRole.OWNER },
  });

  await prisma.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", appName: "Kronos", defaultLocale: "en" },
  });

  // --- Instruments + candles ------------------------------------------------

  const endDate = new Date();
  const instrumentIds: Record<string, string> = {};

  for (const spec of INSTRUMENTS) {
    const existing = await prisma.instrument.findFirst({
      where: { organizationId: org.id, symbol: spec.symbol },
      select: { id: true },
    });
    const row = existing
      ? await prisma.instrument.update({
          where: { id: existing.id },
          data: { name: spec.name, assetClass: spec.assetClass },
        })
      : await prisma.instrument.create({
          data: {
            organizationId: org.id,
            symbol: spec.symbol,
            name: spec.name,
            assetClass: spec.assetClass,
            currency: "USD",
          },
        });
    instrumentIds[spec.symbol] = row.id;

    const candles = generateCandles({
      symbol: spec.symbol,
      startPrice: spec.startPrice,
      drift: spec.drift,
      volatility: spec.volatility,
      bars: BARS,
      endDate,
    });

    // skipDuplicates leans on the (instrumentId, timeframe, ts) unique index, so
    // re-seeding inserts only genuinely new bars.
    await prisma.candle.createMany({
      data: candles.map((k) => ({
        organizationId: org.id,
        instrumentId: row.id,
        timeframe: "D1" as const,
        ts: k.ts,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
      })),
      skipDuplicates: true,
    });
  }

  // --- Strategies -----------------------------------------------------------

  const strategyIds: Record<string, string> = {};
  for (const spec of STRATEGIES) {
    const existing = await prisma.strategy.findFirst({
      where: { organizationId: org.id, name: spec.name },
      select: { id: true },
    });
    const row = existing
      ? await prisma.strategy.update({
          where: { id: existing.id },
          data: { kind: spec.kind, params: spec.params, notes: spec.notes },
        })
      : await prisma.strategy.create({
          data: {
            organizationId: org.id,
            name: spec.name,
            kind: spec.kind,
            params: spec.params,
            notes: spec.notes,
          },
        });
    strategyIds[spec.name] = row.id;
  }

  // --- Signals --------------------------------------------------------------

  async function candlesFor(instrumentId: string) {
    const rows = await prisma.candle.findMany({
      where: { organizationId: org.id, instrumentId },
      orderBy: { ts: "asc" },
      select: { ts: true, open: true, high: true, low: true, close: true, volume: true },
    });
    return rows;
  }

  let signalCount = 0;
  for (const spec of INSTRUMENTS) {
    const candles = await candlesFor(instrumentIds[spec.symbol]);
    if (candles.length === 0) continue;

    for (const s of STRATEGIES) {
      const sig = latestSignal(s.kind as StrategyKind, candles, s.params);
      if (!sig) continue;
      const existing = await prisma.signal.findFirst({
        where: {
          organizationId: org.id,
          instrumentId: instrumentIds[spec.symbol],
          strategyId: strategyIds[s.name],
          ts: sig.ts,
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.signal.create({
        data: {
          organizationId: org.id,
          instrumentId: instrumentIds[spec.symbol],
          strategyId: strategyIds[s.name],
          ts: sig.ts,
          side: sig.target > 0 ? "BUY" : sig.target < 0 ? "SELL" : "FLAT",
          strength: sig.strength,
          price: sig.price,
          reason: sig.reason,
        },
      });
      signalCount += 1;
    }
  }

  // --- Backtests ------------------------------------------------------------
  // One representative run per strategy, each on a different instrument, so the
  // backtests page has a spread of outcomes rather than four identical rows.

  const RUNS = [
    { symbol: "AAPL", strategy: "Trend 20/50" },
    { symbol: "NVDA", strategy: "Breakout 20/10" },
    { symbol: "SPY", strategy: "MACD trend" },
    { symbol: "BTCUSD", strategy: "Mean reversion 14" },
  ];

  let backtestCount = 0;
  for (const run of RUNS) {
    const instrumentId = instrumentIds[run.symbol];
    const strategyId = strategyIds[run.strategy];
    const spec = STRATEGIES.find((s) => s.name === run.strategy)!;

    const existing = await prisma.backtest.findFirst({
      where: { organizationId: org.id, instrumentId, strategyId },
      select: { id: true },
    });
    if (existing) continue;

    const candles = await candlesFor(instrumentId);
    if (candles.length < 60) continue;

    const result = backtest(spec.kind as StrategyKind, candles, spec.params, {
      initialCash: 100_000,
      commissionBps: 5,
      slippageBps: 2,
    });

    await prisma.backtest.create({
      data: {
        organizationId: org.id,
        instrumentId,
        strategyId,
        from: candles[0].ts,
        to: candles[candles.length - 1].ts,
        initialCash: 100_000,
        commissionBps: 5,
        slippageBps: 2,
        finalEquity: result.summary.finalEquity,
        totalReturnPct: result.summary.totalReturnPct,
        cagrPct: result.summary.cagrPct,
        maxDrawdownPct: result.summary.maxDrawdownPct,
        sharpe: result.summary.sharpe,
        winRatePct: result.summary.winRatePct,
        profitFactor: result.summary.profitFactor,
        tradeCount: result.summary.tradeCount,
        equityCurve: result.equityCurve.map((p) => ({
          ts: p.ts.toISOString(),
          equity: Math.round(p.equity * 100) / 100,
        })),
        trades: {
          create: result.trades.map((t) => ({
            side: t.side,
            quantity: t.quantity,
            entryTs: t.entryTs,
            entryPrice: t.entryPrice,
            exitTs: t.exitTs,
            exitPrice: t.exitPrice,
            pnl: t.pnl,
            returnPct: t.returnPct,
            exitReason: t.exitReason,
          })),
        },
      },
    });
    backtestCount += 1;
  }

  // --- Paper account with a few filled orders -------------------------------

  const ACCOUNT_NAME = "Demo book";
  let account = await prisma.account_.findFirst({
    where: { organizationId: org.id, name: ACCOUNT_NAME },
    select: { id: true, cash: true },
  });
  if (!account) {
    const created = await prisma.account_.create({
      data: {
        organizationId: org.id,
        name: ACCOUNT_NAME,
        currency: "USD",
        startingCash: 250_000,
        cash: 250_000,
      },
    });
    account = { id: created.id, cash: created.cash };

    // Settle a handful of opening trades through the same accounting the live
    // order path uses, so the seeded book is consistent with reality.
    const FILLS = [
      { symbol: "AAPL", side: "BUY" as const, quantity: 300 },
      { symbol: "MSFT", side: "BUY" as const, quantity: 120 },
      { symbol: "NVDA", side: "BUY" as const, quantity: 200 },
      { symbol: "GOLD", side: "SELL" as const, quantity: 15 },
    ];

    let cash = created.cash;
    for (const fill of FILLS) {
      const instrumentId = instrumentIds[fill.symbol];
      const latest = await prisma.candle.findFirst({
        where: { organizationId: org.id, instrumentId },
        orderBy: { ts: "desc" },
        select: { close: true },
      });
      if (!latest) continue;

      const price = slippedPrice(latest.close, fill.side, 2);
      const signed = fill.side === "BUY" ? fill.quantity : -fill.quantity;
      const commission = commissionFor(signed, price, 5);
      cash += cashDelta({ quantity: signed, price, commission });

      const after = applyFill({ quantity: 0, avgCost: 0, realizedPnl: 0 }, {
        quantity: signed,
        price,
        commission,
      });

      await prisma.position.create({
        data: {
          organizationId: org.id,
          accountId: created.id,
          instrumentId,
          quantity: after.quantity,
          avgCost: after.avgCost,
          realizedPnl: after.realizedPnl,
        },
      });

      await prisma.order_.create({
        data: {
          organizationId: org.id,
          accountId: created.id,
          instrumentId,
          side: fill.side,
          type: "MARKET",
          quantity: fill.quantity,
          status: "FILLED",
          filledPrice: Math.round(price * 10000) / 10000,
          filledAt: new Date(),
        },
      });
    }

    await prisma.account_.update({ where: { id: created.id }, data: { cash } });
  }

  console.log("Seeded Kronos:", {
    org: org.slug,
    user: user.email,
    instruments: INSTRUMENTS.length,
    barsEach: BARS,
    strategies: STRATEGIES.length,
    signalsWritten: signalCount,
    backtestsWritten: backtestCount,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
