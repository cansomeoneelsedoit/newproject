"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/server/prisma";
import { requireActiveOrgId } from "@/server/org";
import { recordAction } from "@/server/audit";
import { fetchCandles, activeProvider } from "@/server/market-data";
import { analyseInstrument, buildSnapshot } from "@/server/ai";
import { getCandles, newWebhookSecret } from "@/server/kronos";
import { backtest, DEFAULT_CONFIG } from "@/lib/backtest";
import {
  DEFAULT_OOS_FRACTION,
  DEFAULT_RULES,
  checkAcceptance,
  finalVerdict,
  splitSample,
  walkForward,
  walkForwardVerdict,
} from "@/lib/validation";
import { latestSignal, parseParams, type StrategyKind } from "@/lib/strategies";
import {
  applyFill,
  cashDelta,
  commissionFor,
  slippedPrice,
  type Position as PositionState,
} from "@/lib/portfolio";
import { settleOrder } from "@/server/fills";
import { round } from "@/lib/format";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Resolve the caller and their organisation together.
 *
 * `requireActiveOrgId()` verifies membership, so the id it returns is safe to
 * write into rows and scope reads by — unlike the raw cookie.
 */
async function ctx(): Promise<
  { ok: true; userId: string; organizationId: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };
  try {
    const organizationId = await requireActiveOrgId();
    return { ok: true, userId: session.user.id, organizationId };
  } catch {
    return { ok: false, error: "No active organisation" };
  }
}

function refresh() {
  for (const p of ["/", "/instruments", "/signals", "/backtests", "/portfolio"]) {
    revalidatePath(p);
  }
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

const ASSET_CLASSES = ["EQUITY", "CRYPTO", "FX", "COMMODITY", "INDEX"] as const;
const STRATEGY_KINDS = [
  "SMA_CROSSOVER",
  "RSI_REVERSION",
  "DONCHIAN_BREAKOUT",
  "MACD_TREND",
] as const;

// ---------------------------------------------------------------------------
// Instruments & market data
// ---------------------------------------------------------------------------

const instrumentSchema = z.object({
  symbol: z.string().trim().min(1, "Symbol is required").max(20).toUpperCase(),
  name: z.string().trim().min(1, "Name is required").max(120),
  assetClass: z.enum(ASSET_CLASSES).default("EQUITY"),
  currency: z.string().trim().length(3).default("USD"),
  bars: z.coerce.number().int().min(60).max(2000).default(400),
});

/**
 * Add an instrument and immediately pull its price history. Doing both in one
 * action means the instrument is never sitting in the UI with no candles and no
 * explanation — if the provider fails, the instrument is still created and the
 * error is reported so the user can retry the sync.
 */
export async function createInstrument(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = instrumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  let instrumentId: string;
  try {
    const instrument = await prisma.instrument.create({
      data: {
        organizationId: c.organizationId,
        symbol: parsed.data.symbol,
        name: parsed.data.name,
        assetClass: parsed.data.assetClass,
        currency: parsed.data.currency.toUpperCase(),
      },
    });
    instrumentId = instrument.id;
    await recordAction(prisma, {
      type: "instrument.create",
      entityType: "Instrument",
      entityId: instrument.id,
      description: `Added ${instrument.symbol}`,
      userId: c.userId,
      payload: { symbol: instrument.symbol },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "That symbol is already tracked" };
    return { ok: false, error: "Could not create the instrument" };
  }

  const sync = await syncCandles(instrumentId, parsed.data.bars);
  refresh();
  if (!sync.ok) {
    return { ok: false, error: `Instrument added, but the price sync failed: ${sync.error}` };
  }
  return { ok: true, data: { id: instrumentId } };
}

/** Pull bars from the configured provider and upsert them. */
export async function syncCandles(
  instrumentId: string,
  bars = 400,
): Promise<ActionResult<{ inserted: number }>> {
  const c = await ctx();
  if (!c.ok) return c;

  const instrument = await prisma.instrument.findFirst({
    where: { id: instrumentId, organizationId: c.organizationId },
    select: { id: true, symbol: true },
  });
  if (!instrument) return { ok: false, error: "Instrument not found" };

  const result = await fetchCandles({ symbol: instrument.symbol, bars });
  if (result.candles.length === 0) {
    return { ok: false, error: result.note ?? "Provider returned no data" };
  }

  // createMany + skipDuplicates keeps a re-sync cheap: the unique index on
  // (instrumentId, timeframe, ts) makes already-stored bars no-ops rather than
  // errors, so this is safe to run repeatedly.
  const created = await prisma.candle.createMany({
    data: result.candles.map((k) => ({
      organizationId: c.organizationId,
      instrumentId: instrument.id,
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

  refresh();
  return { ok: true, data: { inserted: created.count } };
}

export async function setWatched(instrumentId: string, watched: boolean): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const updated = await prisma.instrument.updateMany({
    where: { id: instrumentId, organizationId: c.organizationId },
    data: { watched },
  });
  if (updated.count === 0) return { ok: false, error: "Instrument not found" };
  refresh();
  return { ok: true };
}

export async function deleteInstrument(instrumentId: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const instrument = await prisma.instrument.findFirst({
    where: { id: instrumentId, organizationId: c.organizationId },
    select: { id: true, symbol: true },
  });
  if (!instrument) return { ok: false, error: "Instrument not found" };

  await prisma.instrument.deleteMany({
    where: { id: instrumentId, organizationId: c.organizationId },
  });
  await recordAction(prisma, {
    type: "instrument.delete",
    entityType: "Instrument",
    entityId: instrumentId,
    description: `Removed ${instrument.symbol}`,
    userId: c.userId,
    payload: { symbol: instrument.symbol },
  });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

const strategySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  kind: z.enum(STRATEGY_KINDS),
  params: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createStrategy(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = strategySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  // Validate the parameter bag against the schema for this specific kind, so a
  // strategy can never be stored with parameters its implementation can't read.
  const params = parseParams(parsed.data.kind, parsed.data.params);
  if (!params) return { ok: false, error: "Those parameters aren't valid for this strategy" };

  try {
    const strategy = await prisma.strategy.create({
      data: {
        organizationId: c.organizationId,
        name: parsed.data.name,
        kind: parsed.data.kind,
        params,
        notes: parsed.data.notes || null,
      },
    });
    await recordAction(prisma, {
      type: "strategy.create",
      entityType: "Strategy",
      entityId: strategy.id,
      description: `Created strategy "${strategy.name}"`,
      userId: c.userId,
      payload: { kind: strategy.kind, params },
    });
    refresh();
    return { ok: true, data: { id: strategy.id } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A strategy with that name already exists" };
    return { ok: false, error: "Could not create the strategy" };
  }
}

export async function deleteStrategy(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const deleted = await prisma.strategy.deleteMany({
    where: { id, organizationId: c.organizationId },
  });
  if (deleted.count === 0) return { ok: false, error: "Strategy not found" };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

/**
 * Persist the current evaluation of every watched instrument against every
 * strategy. The signals page recomputes live; this writes the audit trail.
 */
export async function refreshSignals(): Promise<ActionResult<{ written: number }>> {
  const c = await ctx();
  if (!c.ok) return c;

  const [instruments, strategies] = await Promise.all([
    prisma.instrument.findMany({
      where: { organizationId: c.organizationId, watched: true },
      select: { id: true, symbol: true },
    }),
    prisma.strategy.findMany({
      where: { organizationId: c.organizationId },
      select: { id: true, kind: true, params: true },
    }),
  ]);
  if (instruments.length === 0) return { ok: false, error: "No watched instruments" };
  if (strategies.length === 0) return { ok: false, error: "No strategies configured" };

  let written = 0;
  for (const instrument of instruments) {
    const candles = await getCandles(instrument.id);
    if (candles.length === 0) continue;

    for (const strategy of strategies) {
      const signal = latestSignal(strategy.kind as StrategyKind, candles, strategy.params);
      if (!signal) continue;

      const existing = await prisma.signal.findFirst({
        where: {
          organizationId: c.organizationId,
          instrumentId: instrument.id,
          strategyId: strategy.id,
          ts: signal.ts,
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.signal.create({
        data: {
          organizationId: c.organizationId,
          instrumentId: instrument.id,
          strategyId: strategy.id,
          ts: signal.ts,
          side: signal.target > 0 ? "BUY" : signal.target < 0 ? "SELL" : "FLAT",
          strength: round(signal.strength, 3),
          price: round(signal.price, 4),
          reason: signal.reason,
        },
      });
      written += 1;
    }
  }

  refresh();
  return { ok: true, data: { written } };
}

// ---------------------------------------------------------------------------
// Backtests
// ---------------------------------------------------------------------------

const backtestSchema = z.object({
  instrumentId: z.string().min(1, "Pick an instrument"),
  strategyId: z.string().min(1, "Pick a strategy"),
  initialCash: z.coerce.number().min(100).max(100_000_000).default(100_000),
  commissionBps: z.coerce.number().min(0).max(500).default(5),
  slippageBps: z.coerce.number().min(0).max(500).default(2),
});

export async function runBacktest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = backtestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  const [instrument, strategy] = await Promise.all([
    prisma.instrument.findFirst({
      where: { id: parsed.data.instrumentId, organizationId: c.organizationId },
      select: { id: true, symbol: true },
    }),
    prisma.strategy.findFirst({
      where: { id: parsed.data.strategyId, organizationId: c.organizationId },
      select: { id: true, name: true, kind: true, params: true },
    }),
  ]);
  if (!instrument) return { ok: false, error: "Instrument not found" };
  if (!strategy) return { ok: false, error: "Strategy not found" };

  const candles = await getCandles(instrument.id, 2000);
  // The holdout costs 30% of history and walk-forward needs several windows on
  // top of that, so short series cannot be validated at all. Refuse rather than
  // silently skipping gates and reporting a number that means nothing.
  if (candles.length < 150) {
    return {
      ok: false,
      error: `Need at least 150 bars to validate (have ${candles.length}) — sync more history first`,
    };
  }

  const cfg = {
    initialCash: parsed.data.initialCash,
    commissionBps: parsed.data.commissionBps,
    slippageBps: parsed.data.slippageBps,
    exposure: DEFAULT_CONFIG.exposure,
  };
  const kind = strategy.kind as StrategyKind;
  const runOn = (rows: typeof candles) => backtest(kind, rows, strategy.params, cfg);

  // --- The three gates ------------------------------------------------------
  // 1. Tune and measure on the in-sample period only.
  // 2. Check consistency across windows WITHIN that in-sample period — passing
  //    the full series here would place the windows inside the holdout and
  //    quietly destroy the very thing gate 3 is measuring.
  // 3. Score the untouched holdout exactly once.
  const { inSample, outOfSample } = splitSample(candles, DEFAULT_OOS_FRACTION);

  const isResult = runOn(inSample);
  const windows = walkForward(inSample, runOn, 5, 0.5);
  const wfVerdict = walkForwardVerdict(windows);
  const oosResult = runOn(outOfSample);

  const isCheck = checkAcceptance({
    totalReturnPct: isResult.summary.totalReturnPct,
    sharpe: isResult.summary.sharpe,
    maxDrawdownPct: isResult.summary.maxDrawdownPct,
    profitFactor: isResult.summary.profitFactor,
    tradeCount: isResult.summary.tradeCount,
    winRatePct: isResult.summary.winRatePct,
  });
  // The holdout is judged on a shorter span, so demanding the full trade count
  // there would reject everything on sample size alone. Scale it with the split.
  const oosRules = {
    ...DEFAULT_RULES,
    minTrades: Math.max(5, Math.floor(DEFAULT_RULES.minTrades * DEFAULT_OOS_FRACTION)),
  };
  const oosCheck = checkAcceptance(
    {
      totalReturnPct: oosResult.summary.totalReturnPct,
      sharpe: oosResult.summary.sharpe,
      maxDrawdownPct: oosResult.summary.maxDrawdownPct,
      profitFactor: oosResult.summary.profitFactor,
      tradeCount: oosResult.summary.tradeCount,
      winRatePct: oosResult.summary.winRatePct,
    },
    oosRules,
  );
  const verdict = finalVerdict(isCheck, wfVerdict, oosCheck);

  const created = await prisma.backtest.create({
    data: {
      organizationId: c.organizationId,
      instrumentId: instrument.id,
      strategyId: strategy.id,
      from: inSample[0].ts,
      to: inSample[inSample.length - 1].ts,
      initialCash: parsed.data.initialCash,
      commissionBps: parsed.data.commissionBps,
      slippageBps: parsed.data.slippageBps,
      finalEquity: round(isResult.summary.finalEquity, 2),
      totalReturnPct: round(isResult.summary.totalReturnPct, 2),
      cagrPct: round(isResult.summary.cagrPct, 2),
      maxDrawdownPct: round(isResult.summary.maxDrawdownPct, 2),
      sharpe: round(isResult.summary.sharpe, 3),
      winRatePct: round(isResult.summary.winRatePct, 2),
      // summarise() already clamps an infinite profit factor for storage.
      profitFactor: round(isResult.summary.profitFactor, 3),
      tradeCount: isResult.summary.tradeCount,
      equityCurve: isResult.equityCurve.map((p) => ({
        ts: p.ts.toISOString(),
        equity: round(p.equity, 2),
      })),

      accepted: verdict.accepted,
      verdictSummary: verdict.summary,
      failures: verdict.failures,
      oosFrom: outOfSample[0]?.ts ?? null,
      oosTo: outOfSample[outOfSample.length - 1]?.ts ?? null,
      oosReturnPct: round(oosResult.summary.totalReturnPct, 2),
      oosSharpe: round(oosResult.summary.sharpe, 3),
      oosMaxDrawdownPct: round(oosResult.summary.maxDrawdownPct, 2),
      oosTradeCount: oosResult.summary.tradeCount,
      oosWinRatePct: round(oosResult.summary.winRatePct, 2),
      walkForwardPassed: wfVerdict.passed,
      walkForwardReason: wfVerdict.reason,
      walkForwardWindows: windows.map((w) => ({
        window: w.window,
        from: w.from.toISOString(),
        to: w.to.toISOString(),
        bars: w.bars,
        totalReturnPct: round(w.totalReturnPct, 2),
        sharpe: round(w.sharpe, 3),
        maxDrawdownPct: round(w.maxDrawdownPct, 2),
        tradeCount: w.tradeCount,
        winRatePct: round(w.winRatePct, 2),
      })),

      trades: {
        create: isResult.trades.map((t) => ({
          side: t.side,
          quantity: round(t.quantity, 6),
          entryTs: t.entryTs,
          entryPrice: round(t.entryPrice, 4),
          exitTs: t.exitTs,
          exitPrice: t.exitPrice === null ? null : round(t.exitPrice, 4),
          pnl: round(t.pnl, 2),
          returnPct: round(t.returnPct, 3),
          exitReason: t.exitReason,
        })),
      },
    },
  });

  await recordAction(prisma, {
    type: "backtest.run",
    entityType: "Backtest",
    entityId: created.id,
    description: `Backtested "${strategy.name}" on ${instrument.symbol} — ${
      verdict.accepted ? "accepted" : "rejected"
    }`,
    userId: c.userId,
    payload: {
      symbol: instrument.symbol,
      inSampleReturnPct: round(isResult.summary.totalReturnPct, 2),
      oosReturnPct: round(oosResult.summary.totalReturnPct, 2),
      accepted: verdict.accepted,
      failures: verdict.failures,
    },
  });

  refresh();
  return { ok: true, data: { id: created.id } };
}

export async function deleteBacktest(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const deleted = await prisma.backtest.deleteMany({
    where: { id, organizationId: c.organizationId },
  });
  if (deleted.count === 0) return { ok: false, error: "Backtest not found" };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Paper trading
// ---------------------------------------------------------------------------

const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  currency: z.string().trim().length(3).default("USD"),
  startingCash: z.coerce.number().min(100).max(100_000_000).default(100_000),
});

export async function createAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const account = await prisma.account_.create({
      data: {
        organizationId: c.organizationId,
        name: parsed.data.name,
        currency: parsed.data.currency.toUpperCase(),
        startingCash: parsed.data.startingCash,
        cash: parsed.data.startingCash,
      },
    });
    await recordAction(prisma, {
      type: "account.create",
      entityType: "Account",
      entityId: account.id,
      description: `Opened paper account "${account.name}"`,
      userId: c.userId,
      payload: { startingCash: parsed.data.startingCash },
    });
    refresh();
    return { ok: true, data: { id: account.id } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "An account with that name already exists" };
    return { ok: false, error: "Could not open the account" };
  }
}

const orderSchema = z.object({
  accountId: z.string().min(1, "Pick an account"),
  instrumentId: z.string().min(1, "Pick an instrument"),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
  quantity: z.coerce.number().positive("Quantity must be positive").max(10_000_000),
  limitPrice: z.coerce.number().positive().max(10_000_000).nullable().optional(),
  slippageBps: z.coerce.number().min(0).max(500).default(2),
  commissionBps: z.coerce.number().min(0).max(500).default(5),
});

/**
 * Place a paper order from the UI.
 *
 * The fill itself lives in `src/server/fills.ts` and is shared with the
 * TradingView webhook — see the fill model documented there. This wrapper only
 * resolves the caller's organisation, records the audit entry and revalidates.
 */
export async function placeOrder(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  if (parsed.data.type === "LIMIT" && !parsed.data.limitPrice) {
    return { ok: false, error: "A limit order needs a limit price" };
  }

  const settled = await settleOrder({ ...parsed.data, organizationId: c.organizationId });
  if (!settled.ok) return settled;

  if (settled.status === "FILLED") {
    await recordAction(prisma, {
      type: "order.fill",
      entityType: "Order",
      entityId: settled.orderId,
      description: `${parsed.data.side} ${parsed.data.quantity} ${settled.symbol} @ ${settled.fillPrice}`,
      userId: c.userId,
      payload: { symbol: settled.symbol, side: parsed.data.side, price: settled.fillPrice },
    });
  }

  refresh();
  return { ok: true, data: { id: settled.orderId, status: settled.status } };
}

export async function cancelOrder(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const updated = await prisma.order_.updateMany({
    where: { id, organizationId: c.organizationId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 0) return { ok: false, error: "No pending order to cancel" };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// AI analysis
// ---------------------------------------------------------------------------

export async function generateAnalysis(instrumentId: string): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c.ok) return c;

  const instrument = await prisma.instrument.findFirst({
    where: { id: instrumentId, organizationId: c.organizationId },
    select: { id: true, symbol: true, name: true },
  });
  if (!instrument) return { ok: false, error: "Instrument not found" };

  const candles = await getCandles(instrument.id);
  if (candles.length < 60) {
    return { ok: false, error: "Not enough price history to analyse — sync more bars first" };
  }

  const strategies = await prisma.strategy.findMany({
    where: { organizationId: c.organizationId },
    select: { name: true, kind: true, params: true },
  });

  type SignalSummary = { strategy: string; side: string; reason: string };
  const signals: SignalSummary[] = [];
  for (const s of strategies as { name: string; kind: string; params: unknown }[]) {
    const sig = latestSignal(s.kind as StrategyKind, candles, s.params);
    if (!sig) continue;
    signals.push({
      strategy: s.name,
      side: sig.target > 0 ? "BUY" : sig.target < 0 ? "SELL" : "FLAT",
      reason: sig.reason,
    });
  }

  const provider = activeProvider();
  const snapshot = buildSnapshot(
    {
      symbol: instrument.symbol,
      name: instrument.name,
      provider,
      synthetic: provider === "synthetic",
    },
    candles,
    signals,
  );

  const analysis = await analyseInstrument(snapshot);

  const row = await prisma.aiAnalysis.create({
    data: {
      organizationId: c.organizationId,
      instrumentId: instrument.id,
      model: analysis.model,
      headline: analysis.headline,
      content: analysis.content,
      context: JSON.parse(JSON.stringify(analysis.context)),
    },
  });

  await recordAction(prisma, {
    type: "analysis.create",
    entityType: "AiAnalysis",
    entityId: row.id,
    description: `Analysed ${instrument.symbol} (${analysis.model})`,
    userId: c.userId,
    payload: { symbol: instrument.symbol, model: analysis.model },
  });

  revalidatePath(`/instruments/${instrument.id}`);
  refresh();
  return { ok: true, data: { id: row.id } };
}

// ---------------------------------------------------------------------------
// TradingView endpoint
// ---------------------------------------------------------------------------

const endpointSchema = z.object({
  accountId: z.string().min(1).nullable().optional(),
  enabled: z.boolean().default(true),
  notionalPerTrade: z.coerce.number().positive("Notional must be positive").max(10_000_000),
  slippageBps: z.coerce.number().min(0).max(500).default(2),
  commissionBps: z.coerce.number().min(0).max(500).default(5),
});

export async function updateWebhookEndpoint(input: unknown): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const accountId = parsed.data.accountId ?? null;
  if (accountId) {
    const account = await prisma.account_.findFirst({
      where: { id: accountId, organizationId: c.organizationId },
      select: { id: true },
    });
    if (!account) return { ok: false, error: "Account not found" };
  }

  await prisma.webhookEndpoint.upsert({
    where: { organizationId: c.organizationId },
    create: {
      organizationId: c.organizationId,
      secret: newWebhookSecret(),
      accountId,
      enabled: parsed.data.enabled,
      notionalPerTrade: parsed.data.notionalPerTrade,
      slippageBps: parsed.data.slippageBps,
      commissionBps: parsed.data.commissionBps,
    },
    update: {
      accountId,
      enabled: parsed.data.enabled,
      notionalPerTrade: parsed.data.notionalPerTrade,
      slippageBps: parsed.data.slippageBps,
      commissionBps: parsed.data.commissionBps,
    },
  });

  revalidatePath("/alerts");
  return { ok: true };
}

/**
 * Rotate the shared secret. Every Pine script already pasted into TradingView
 * stops working the moment this runs — that is the point, and the UI says so.
 */
export async function rotateWebhookSecret(): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return c;
  const secret = newWebhookSecret();
  await prisma.webhookEndpoint.upsert({
    where: { organizationId: c.organizationId },
    create: { organizationId: c.organizationId, secret },
    update: { secret },
  });

  await recordAction(prisma, {
    type: "webhook.rotate",
    entityType: "WebhookEndpoint",
    entityId: c.organizationId,
    description: "Rotated the TradingView webhook secret",
    userId: c.userId,
  });

  revalidatePath("/alerts");
  return { ok: true };
}
