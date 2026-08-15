/**
 * Technical indicators.
 *
 * Every function is pure and returns an array the SAME LENGTH as its input,
 * using `null` for bars where the indicator is not yet defined (the warm-up
 * period). Keeping the arrays aligned with the candle array is what lets the
 * backtest engine index into candles and indicators with the same `i` — a
 * ragged "skip the first N" convention is the classic source of off-by-one
 * lookahead bugs in backtests.
 */

export type Candle = {
  ts: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Series = (number | null)[];

/** Simple moving average over `period` closes. */
export function sma(values: number[], period: number): Series {
  if (period <= 0) throw new Error("sma: period must be > 0");
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential moving average, seeded with the SMA of the first `period` values
 * so the series does not depend on how much history preceded it.
 */
export function ema(values: number[], period: number): Series {
  if (period <= 0) throw new Error("ema: period must be > 0");
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;

  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/**
 * Wilder's RSI. Returns 0..100.
 *
 * A period of all-gains yields 100 and all-losses yields 0; the zero-loss case
 * is special-cased rather than dividing by zero.
 */
export function rsi(values: number[], period = 14): Series {
  if (period <= 0) throw new Error("rsi: period must be > 0");
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d >= 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    // Wilder smoothing.
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** True range of bar `i`, which needs the previous close. */
function trueRange(candles: Candle[], i: number): number {
  const c = candles[i];
  if (i === 0) return c.high - c.low;
  const prevClose = candles[i - 1].close;
  return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
}

/** Average true range (Wilder). Used for volatility-scaled position sizing. */
export function atr(candles: Candle[], period = 14): Series {
  const out: Series = new Array(candles.length).fill(null);
  if (candles.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trueRange(candles, i);
  let prev = sum / period;
  out[period - 1] = prev;

  for (let i = period; i < candles.length; i++) {
    prev = (prev * (period - 1) + trueRange(candles, i)) / period;
    out[i] = prev;
  }
  return out;
}

export type MacdResult = { macd: Series; signal: Series; histogram: Series };

/** MACD line, its signal EMA, and the histogram between them. */
export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  if (fast >= slow) throw new Error("macd: fast period must be < slow period");
  const fastE = ema(values, fast);
  const slowE = ema(values, slow);

  const macdLine: Series = values.map((_, i) =>
    fastE[i] === null || slowE[i] === null ? null : (fastE[i] as number) - (slowE[i] as number),
  );

  // The signal EMA runs over the defined part of the MACD line only, then is
  // written back at the matching offsets so all three series stay aligned.
  const firstDefined = macdLine.findIndex((v) => v !== null);
  const signal: Series = new Array(values.length).fill(null);
  if (firstDefined !== -1) {
    const dense = macdLine.slice(firstDefined) as number[];
    const denseSignal = ema(dense, signalPeriod);
    for (let i = 0; i < denseSignal.length; i++) signal[firstDefined + i] = denseSignal[i];
  }

  const histogram: Series = values.map((_, i) =>
    macdLine[i] === null || signal[i] === null ? null : (macdLine[i] as number) - (signal[i] as number),
  );

  return { macd: macdLine, signal, histogram };
}

export type Bands = { upper: Series; middle: Series; lower: Series };

/** Bollinger bands: SMA ± `mult` population standard deviations. */
export function bollinger(values: number[], period = 20, mult = 2): Bands {
  const middle = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);

  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i] as number;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { upper, middle, lower };
}

export type Channel = { upper: Series; lower: Series };

/**
 * Donchian channel — the highest high and lowest low of the PREVIOUS `period`
 * bars, deliberately excluding the current bar. Including the current bar would
 * make a breakout condition trivially true on the bar that sets the high, which
 * is lookahead bias.
 */
export function donchian(candles: Candle[], period = 20): Channel {
  const upper: Series = new Array(candles.length).fill(null);
  const lower: Series = new Array(candles.length).fill(null);

  for (let i = period; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period; j < i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    upper[i] = hi;
    lower[i] = lo;
  }
  return { upper, lower };
}

/** Bar-to-bar simple returns. `out[0]` is null — there is no prior bar. */
export function returns(values: number[]): Series {
  const out: Series = new Array(values.length).fill(null);
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    out[i] = prev === 0 ? 0 : (values[i] - prev) / prev;
  }
  return out;
}

/** Population standard deviation of a plain number array. */
export function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
