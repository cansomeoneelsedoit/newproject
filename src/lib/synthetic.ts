/**
 * Deterministic synthetic price generation.
 *
 * Kronos ships with no market-data credentials, so the default provider
 * generates plausible OHLCV series locally. Being seeded and deterministic
 * matters for more than convenience: it means the demo data, the seeded
 * backtests, and the tests all reproduce exactly, and a screenshot taken today
 * matches one taken tomorrow.
 *
 * This is emphatically NOT real market data. It is a geometric random walk with
 * drift and volatility clustering — good enough to exercise indicators,
 * strategies and the backtester, and not good enough to draw any conclusion
 * about a real instrument.
 */

import type { Candle } from "./indicators";

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 * Seeded explicitly so every caller gets a reproducible stream.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller transform: two uniforms in, one standard normal out. */
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  // Guard against log(0).
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Turn a symbol into a stable seed so each instrument has its own character. */
export function seedFromSymbol(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type SyntheticSpec = {
  symbol: string;
  startPrice: number;
  /** Annualised drift, as a fraction (0.08 = 8% a year). */
  drift: number;
  /** Annualised volatility, as a fraction (0.25 = 25%). */
  volatility: number;
  bars: number;
  /** Date of the LAST bar; the series is generated backwards from here. */
  endDate: Date;
};

const TRADING_DAYS = 252;

/**
 * Generate `bars` daily candles ending on `endDate`, skipping weekends so the
 * timestamps look like a real daily series.
 */
export function generateCandles(spec: SyntheticSpec): Candle[] {
  const rng = makeRng(seedFromSymbol(spec.symbol));
  const dt = 1 / TRADING_DAYS;
  const driftPerBar = (spec.drift - 0.5 * spec.volatility ** 2) * dt;

  // Volatility clusters: a slow-moving multiplier so quiet and wild stretches
  // both appear, which is what makes ATR and drawdown numbers interesting.
  let volMult = 1;

  const dates = tradingDaysEndingAt(spec.endDate, spec.bars);
  const candles: Candle[] = [];
  let price = spec.startPrice;

  for (let i = 0; i < spec.bars; i++) {
    volMult = Math.max(0.4, Math.min(2.5, volMult + gaussian(rng) * 0.06));
    const sigma = spec.volatility * volMult * Math.sqrt(dt);
    const ret = driftPerBar + sigma * gaussian(rng);

    const open = price;
    const close = Math.max(0.01, open * Math.exp(ret));

    // Intrabar extremes: a fraction of the bar's own move plus noise.
    const body = Math.abs(close - open);
    const wick = body * (0.3 + rng() * 1.2) + open * sigma * 0.4;
    const high = Math.max(open, close) + wick * rng();
    const low = Math.max(0.005, Math.min(open, close) - wick * rng());

    // Volume rises with the size of the move, as it tends to in real markets.
    const volume = Math.round(500_000 * (0.5 + rng()) * (1 + (body / open) * 25));

    candles.push({ ts: dates[i], open, high, low, close, volume });
    price = close;
  }

  return candles;
}

/** The `count` most recent weekdays ending at `end`, oldest first, UTC midnight. */
export function tradingDaysEndingAt(end: Date, count: number): Date[] {
  const out: Date[] = [];
  const cursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (out.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out.reverse();
}
