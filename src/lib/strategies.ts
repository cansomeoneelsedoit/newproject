/**
 * Strategy registry.
 *
 * A strategy turns candles into a *target position* per bar — `1` for long,
 * `-1` for short, `0` for flat — plus a human-readable reason. Returning a
 * target rather than an "entry/exit" event keeps the backtester simple and
 * makes strategies trivially composable.
 *
 * The hard rule every strategy here obeys: **the target for bar `i` may only
 * use data from bars `0..i`.** The backtest engine then executes that target at
 * bar `i+1`'s open. Reading bar `i+1` (or using an indicator that peeks ahead)
 * is lookahead bias and produces backtests that cannot be traded.
 */

import { z } from "zod";

import { donchian, ema, macd, rsi, sma, type Candle } from "./indicators";

export type TargetSide = -1 | 0 | 1;

export type StrategyBar = {
  /** Desired position for this bar, decided from data up to and including it. */
  target: TargetSide;
  /** 0..1 conviction. Used to rank signals in the UI, not to size trades. */
  strength: number;
  reason: string;
};

export type StrategyKind =
  | "SMA_CROSSOVER"
  | "RSI_REVERSION"
  | "DONCHIAN_BREAKOUT"
  | "MACD_TREND";

// ---------------------------------------------------------------------------
// Parameter schemas — these double as the Server Action validators.
// ---------------------------------------------------------------------------

export const smaCrossoverParams = z.object({
  fast: z.coerce.number().int().min(2).max(200).default(20),
  slow: z.coerce.number().int().min(3).max(400).default(50),
  allowShort: z.boolean().default(false),
});

export const rsiReversionParams = z.object({
  period: z.coerce.number().int().min(2).max(100).default(14),
  oversold: z.coerce.number().min(1).max(49).default(30),
  overbought: z.coerce.number().min(51).max(99).default(70),
  allowShort: z.boolean().default(false),
});

export const donchianBreakoutParams = z.object({
  entryPeriod: z.coerce.number().int().min(2).max(400).default(20),
  exitPeriod: z.coerce.number().int().min(2).max(400).default(10),
  allowShort: z.boolean().default(false),
});

export const macdTrendParams = z.object({
  fast: z.coerce.number().int().min(2).max(100).default(12),
  slow: z.coerce.number().int().min(3).max(200).default(26),
  signal: z.coerce.number().int().min(2).max(100).default(9),
  allowShort: z.boolean().default(false),
});

export const STRATEGY_PARAM_SCHEMAS = {
  SMA_CROSSOVER: smaCrossoverParams,
  RSI_REVERSION: rsiReversionParams,
  DONCHIAN_BREAKOUT: donchianBreakoutParams,
  MACD_TREND: macdTrendParams,
} as const;

export const STRATEGY_LABELS: Record<StrategyKind, string> = {
  SMA_CROSSOVER: "SMA crossover",
  RSI_REVERSION: "RSI mean reversion",
  DONCHIAN_BREAKOUT: "Donchian breakout",
  MACD_TREND: "MACD trend",
};

export const STRATEGY_DESCRIPTIONS: Record<StrategyKind, string> = {
  SMA_CROSSOVER: "Long while the fast average is above the slow average. A trend follower.",
  RSI_REVERSION: "Buy oversold, exit as RSI recovers. Fades extremes; struggles in strong trends.",
  DONCHIAN_BREAKOUT: "Enter on a break of the N-bar high, exit on a break of the shorter-period low.",
  MACD_TREND: "Long while the MACD line leads its signal line.",
};

/**
 * Validate a raw parameter bag for a strategy kind, filling defaults.
 * Returns null when the bag is invalid for that kind.
 */
export function parseParams(kind: StrategyKind, raw: unknown): Record<string, unknown> | null {
  const schema = STRATEGY_PARAM_SCHEMAS[kind];
  if (!schema) return null;
  const parsed = schema.safeParse(raw ?? {});
  return parsed.success ? (parsed.data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

function blank(n: number): StrategyBar[] {
  return new Array(n).fill(null).map(() => ({ target: 0 as TargetSide, strength: 0, reason: "" }));
}

function smaCrossover(candles: Candle[], raw: unknown): StrategyBar[] {
  const p = smaCrossoverParams.parse(raw ?? {});
  const out = blank(candles.length);
  // A fast period at or above the slow period would make the crossover
  // meaningless; treat it as a flat strategy rather than emitting noise.
  if (p.fast >= p.slow) return out;

  const closes = candles.map((c) => c.close);
  const fast = sma(closes, p.fast);
  const slow = sma(closes, p.slow);

  for (let i = 0; i < candles.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (f === null || s === null) continue;

    const spreadPct = s === 0 ? 0 : ((f - s) / s) * 100;
    // Conviction saturates at a 5% separation — beyond that it is "very
    // extended", and scaling further adds nothing useful to a ranking.
    const strength = Math.min(1, Math.abs(spreadPct) / 5);

    if (f > s) {
      out[i] = { target: 1, strength, reason: `Fast SMA ${p.fast} above slow SMA ${p.slow} by ${spreadPct.toFixed(2)}%` };
    } else if (p.allowShort) {
      out[i] = { target: -1, strength, reason: `Fast SMA ${p.fast} below slow SMA ${p.slow} by ${spreadPct.toFixed(2)}%` };
    } else {
      out[i] = { target: 0, strength, reason: `Fast SMA ${p.fast} below slow SMA ${p.slow} — flat` };
    }
  }
  return out;
}

function rsiReversion(candles: Candle[], raw: unknown): StrategyBar[] {
  const p = rsiReversionParams.parse(raw ?? {});
  const out = blank(candles.length);
  if (p.oversold >= p.overbought) return out;

  const closes = candles.map((c) => c.close);
  const r = rsi(closes, p.period);

  // Mean reversion is stateful: having bought oversold we stay long until RSI
  // climbs back through the midline, rather than flipping flat the moment it
  // ticks above the oversold threshold.
  const mid = (p.oversold + p.overbought) / 2;
  let holding: TargetSide = 0;

  for (let i = 0; i < candles.length; i++) {
    const v = r[i];
    if (v === null) continue;

    if (holding === 0) {
      if (v <= p.oversold) {
        holding = 1;
        out[i] = { target: 1, strength: Math.min(1, (p.oversold - v) / p.oversold), reason: `RSI ${v.toFixed(1)} at or below ${p.oversold} — oversold` };
        continue;
      }
      if (p.allowShort && v >= p.overbought) {
        holding = -1;
        out[i] = { target: -1, strength: Math.min(1, (v - p.overbought) / (100 - p.overbought)), reason: `RSI ${v.toFixed(1)} at or above ${p.overbought} — overbought` };
        continue;
      }
      out[i] = { target: 0, strength: 0, reason: `RSI ${v.toFixed(1)} — no edge` };
      continue;
    }

    if (holding === 1) {
      if (v >= mid) {
        holding = 0;
        out[i] = { target: 0, strength: 0, reason: `RSI ${v.toFixed(1)} recovered through ${mid} — exit long` };
      } else {
        out[i] = { target: 1, strength: Math.min(1, (p.oversold - v) / p.oversold), reason: `Holding long, RSI ${v.toFixed(1)}` };
      }
      continue;
    }

    if (v <= mid) {
      holding = 0;
      out[i] = { target: 0, strength: 0, reason: `RSI ${v.toFixed(1)} fell through ${mid} — exit short` };
    } else {
      out[i] = { target: -1, strength: Math.min(1, (v - p.overbought) / (100 - p.overbought)), reason: `Holding short, RSI ${v.toFixed(1)}` };
    }
  }
  return out;
}

function donchianBreakout(candles: Candle[], raw: unknown): StrategyBar[] {
  const p = donchianBreakoutParams.parse(raw ?? {});
  const out = blank(candles.length);

  const entry = donchian(candles, p.entryPeriod);
  const exit = donchian(candles, p.exitPeriod);
  let holding: TargetSide = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const eu = entry.upper[i];
    const el = entry.lower[i];
    const xu = exit.upper[i];
    const xl = exit.lower[i];
    if (eu === null || el === null || xu === null || xl === null) continue;

    if (holding === 0) {
      if (c.close > eu) {
        holding = 1;
        out[i] = { target: 1, strength: Math.min(1, (c.close - eu) / eu / 0.05), reason: `Closed above the ${p.entryPeriod}-bar high (${eu.toFixed(2)})` };
      } else if (p.allowShort && c.close < el) {
        holding = -1;
        out[i] = { target: -1, strength: Math.min(1, (el - c.close) / el / 0.05), reason: `Closed below the ${p.entryPeriod}-bar low (${el.toFixed(2)})` };
      } else {
        out[i] = { target: 0, strength: 0, reason: "Inside the channel" };
      }
      continue;
    }

    if (holding === 1) {
      if (c.close < xl) {
        holding = 0;
        out[i] = { target: 0, strength: 0, reason: `Closed below the ${p.exitPeriod}-bar low — exit` };
      } else {
        out[i] = { target: 1, strength: 0.5, reason: "Holding the breakout" };
      }
      continue;
    }

    if (c.close > xu) {
      holding = 0;
      out[i] = { target: 0, strength: 0, reason: `Closed above the ${p.exitPeriod}-bar high — cover` };
    } else {
      out[i] = { target: -1, strength: 0.5, reason: "Holding the short breakout" };
    }
  }
  return out;
}

function macdTrend(candles: Candle[], raw: unknown): StrategyBar[] {
  const p = macdTrendParams.parse(raw ?? {});
  const out = blank(candles.length);
  if (p.fast >= p.slow) return out;

  const closes = candles.map((c) => c.close);
  const { macd: line, signal, histogram } = macd(closes, p.fast, p.slow, p.signal);
  // EMA of close is used only to describe the regime in the reason text.
  const trend = ema(closes, p.slow);

  for (let i = 0; i < candles.length; i++) {
    const m = line[i];
    const s = signal[i];
    const h = histogram[i];
    if (m === null || s === null || h === null) continue;

    const px = candles[i].close;
    const t = trend[i];
    const regime = t === null ? "" : px > t ? " above trend" : " below trend";
    const strength = Math.min(1, Math.abs(h) / (px * 0.01 || 1));

    if (m > s) {
      out[i] = { target: 1, strength, reason: `MACD above signal${regime}` };
    } else if (p.allowShort) {
      out[i] = { target: -1, strength, reason: `MACD below signal${regime}` };
    } else {
      out[i] = { target: 0, strength, reason: `MACD below signal${regime} — flat` };
    }
  }
  return out;
}

const IMPLEMENTATIONS: Record<StrategyKind, (c: Candle[], p: unknown) => StrategyBar[]> = {
  SMA_CROSSOVER: smaCrossover,
  RSI_REVERSION: rsiReversion,
  DONCHIAN_BREAKOUT: donchianBreakout,
  MACD_TREND: macdTrend,
};

/** Run a strategy over candles, producing one target per bar. */
export function runStrategy(kind: StrategyKind, candles: Candle[], params: unknown): StrategyBar[] {
  const impl = IMPLEMENTATIONS[kind];
  if (!impl) throw new Error(`Unknown strategy kind: ${kind}`);
  return impl(candles, params);
}

/** The strategy's view of the latest bar — what the signals page shows. */
export function latestSignal(
  kind: StrategyKind,
  candles: Candle[],
  params: unknown,
): (StrategyBar & { ts: Date; price: number }) | null {
  if (candles.length === 0) return null;
  const bars = runStrategy(kind, candles, params);
  const i = candles.length - 1;
  return { ...bars[i], ts: candles[i].ts, price: candles[i].close };
}
