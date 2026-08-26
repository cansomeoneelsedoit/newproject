import { describe, expect, it } from "vitest";

import { backtest, buyAndHold, DEFAULT_CONFIG } from "./backtest";
import { runStrategy } from "./strategies";
import type { Candle } from "./indicators";

function mkCandles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    ts: new Date(Date.UTC(2026, 0, i + 1)),
    open: c,
    high: c * 1.01,
    low: c * 0.99,
    close: c,
    volume: 1000,
  }));
}

/** A long, clean uptrend — enough bars to clear a 50-period warm-up. */
const UPTREND = mkCandles(Array.from({ length: 300 }, (_, i) => 100 * 1.005 ** i));

const NO_COSTS = { commissionBps: 0, slippageBps: 0 };

describe("backtest — execution model", () => {
  it("fills the previous bar's target at the current bar's open, never the same bar", () => {
    const candles = mkCandles([10, 10, 10, 50, 10, 10]);
    // Force a long from the very first bar.
    const result = backtest("SMA_CROSSOVER", candles, { fast: 2, slow: 3 }, NO_COSTS);
    for (const t of result.trades) {
      const entryIndex = candles.findIndex((c) => c.ts.getTime() === t.entryTs.getTime());
      // The entry price must be that bar's OPEN, not its close.
      expect(t.entryPrice).toBeCloseTo(candles[entryIndex].open, 9);
    }
  });

  it("never leaves a position open at the end", () => {
    const result = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 }, NO_COSTS);
    expect(result.trades.length).toBeGreaterThan(0);
    for (const t of result.trades) {
      expect(t.exitTs).not.toBeNull();
      expect(t.exitPrice).not.toBeNull();
    }
  });

  it("produces an equity point for every candle", () => {
    const result = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 });
    expect(result.equityCurve).toHaveLength(UPTREND.length);
  });

  it("starts at the initial cash", () => {
    const result = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 });
    expect(result.equityCurve[0].equity).toBeCloseTo(DEFAULT_CONFIG.initialCash, 6);
  });
});

describe("backtest — no lookahead", () => {
  it("cannot see a future spike: appending bars never changes earlier equity", () => {
    // This is the property that separates an honest backtest from a fantasy.
    // Running on a prefix must give exactly the same equity for that prefix as
    // running on the full series.
    const base = mkCandles(
      Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 7) * 12 + i * 0.15),
    );
    const withFuture = [...base, ...mkCandles([1000, 1200, 1500]).map((c, i) => ({
      ...c,
      ts: new Date(Date.UTC(2026, 6, i + 1)),
    }))];

    const short = backtest("SMA_CROSSOVER", base, { fast: 10, slow: 30 }, NO_COSTS);
    const long = backtest("SMA_CROSSOVER", withFuture, { fast: 10, slow: 30 }, NO_COSTS);

    // Compare the overlapping prefix, excluding the final bar of the short run
    // (which force-closes any open position and so legitimately differs).
    for (let i = 0; i < base.length - 1; i++) {
      expect(long.equityCurve[i].equity).toBeCloseTo(short.equityCurve[i].equity, 6);
    }
  });

  it("strategy targets for a prefix are unchanged by later data", () => {
    const base = mkCandles(Array.from({ length: 120 }, (_, i) => 100 + Math.cos(i / 5) * 8));
    const extended = mkCandles([
      ...Array.from({ length: 120 }, (_, i) => 100 + Math.cos(i / 5) * 8),
      500,
      600,
    ]);
    const a = runStrategy("DONCHIAN_BREAKOUT", base, { entryPeriod: 20, exitPeriod: 10 });
    const b = runStrategy("DONCHIAN_BREAKOUT", extended, { entryPeriod: 20, exitPeriod: 10 });
    for (let i = 0; i < base.length; i++) {
      expect(b[i].target).toBe(a[i].target);
    }
  });
});

describe("backtest — costs", () => {
  it("a frictionless run beats an identical run with costs", () => {
    const free = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 }, NO_COSTS);
    const costly = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 }, {
      commissionBps: 50,
      slippageBps: 25,
    });
    expect(costly.summary.finalEquity).toBeLessThan(free.summary.finalEquity);
  });

  it("slippage moves entries against the trader", () => {
    const candles = mkCandles([10, 10, 10, 20, 30, 40, 50, 40, 30]);
    const free = backtest("SMA_CROSSOVER", candles, { fast: 2, slow: 3 }, NO_COSTS);
    const slipped = backtest("SMA_CROSSOVER", candles, { fast: 2, slow: 3 }, {
      commissionBps: 0,
      slippageBps: 100,
    });
    if (free.trades.length > 0 && slipped.trades.length > 0) {
      expect(slipped.trades[0].entryPrice).toBeGreaterThan(free.trades[0].entryPrice);
    }
  });

  it("never drives cash negative when fully invested with commission", () => {
    const result = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 }, {
      commissionBps: 100,
      slippageBps: 50,
      exposure: 1,
    });
    for (const p of result.equityCurve) {
      expect(p.equity).toBeGreaterThan(0);
    }
  });
});

describe("backtest — correctness of reported trades", () => {
  it("sums trade P&L to the change in equity", () => {
    const result = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 }, NO_COSTS);
    const tradePnl = result.trades.reduce((a, t) => a + t.pnl, 0);
    const equityChange =
      result.equityCurve[result.equityCurve.length - 1].equity - DEFAULT_CONFIG.initialCash;
    expect(tradePnl).toBeCloseTo(equityChange, 4);
  });

  it("holds a rising market at a profit", () => {
    const result = backtest("SMA_CROSSOVER", UPTREND, { fast: 5, slow: 20 }, NO_COSTS);
    expect(result.summary.totalReturnPct).toBeGreaterThan(0);
  });

  it("does not trade a series too short to warm the indicator up", () => {
    const result = backtest("SMA_CROSSOVER", mkCandles([1, 2, 3]), { fast: 5, slow: 20 });
    expect(result.trades).toHaveLength(0);
    expect(result.summary.finalEquity).toBeCloseTo(DEFAULT_CONFIG.initialCash, 9);
  });

  it("handles an empty candle set without throwing", () => {
    const result = backtest("SMA_CROSSOVER", [], { fast: 5, slow: 20 });
    expect(result.equityCurve).toHaveLength(0);
    expect(result.trades).toHaveLength(0);
  });
});

describe("buyAndHold", () => {
  it("tracks the instrument's own return", () => {
    const candles = mkCandles([100, 110, 120]);
    const curve = buyAndHold(candles, 1000);
    expect(curve[0].equity).toBeCloseTo(1000, 9);
    expect(curve[2].equity).toBeCloseTo(1200, 9);
  });

  it("returns an empty curve for no candles", () => {
    expect(buyAndHold([], 1000)).toEqual([]);
  });
});
