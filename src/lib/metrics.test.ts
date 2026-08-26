import { describe, expect, it } from "vitest";

import {
  cagrPct,
  expectancy,
  finiteProfitFactor,
  maxDrawdownPct,
  profitFactor,
  sharpe,
  sortino,
  summarise,
  totalReturnPct,
  winRatePct,
  type EquityPoint,
} from "./metrics";

function curve(values: number[], startYear = 2026): EquityPoint[] {
  return values.map((equity, i) => ({
    ts: new Date(Date.UTC(startYear, 0, i + 1)),
    equity,
  }));
}

describe("totalReturnPct", () => {
  it("computes the simple end-to-end return", () => {
    expect(totalReturnPct(curve([100, 150]))).toBeCloseTo(50, 9);
    expect(totalReturnPct(curve([100, 50]))).toBeCloseTo(-50, 9);
  });

  it("is zero for a degenerate curve", () => {
    expect(totalReturnPct([])).toBe(0);
    expect(totalReturnPct(curve([100]))).toBe(0);
    expect(totalReturnPct(curve([0, 100]))).toBe(0);
  });
});

describe("cagrPct", () => {
  it("annualises a multi-year gain", () => {
    const points: EquityPoint[] = [
      { ts: new Date(Date.UTC(2020, 0, 1)), equity: 100 },
      { ts: new Date(Date.UTC(2024, 0, 1)), equity: 200 },
    ];
    // ~4 years to double → ~18.9% a year.
    expect(cagrPct(points)).toBeGreaterThan(17);
    expect(cagrPct(points)).toBeLessThan(20);
  });

  it("refuses to annualise a sub-daily window", () => {
    const points: EquityPoint[] = [
      { ts: new Date(Date.UTC(2026, 0, 1, 0)), equity: 100 },
      { ts: new Date(Date.UTC(2026, 0, 1, 6)), equity: 200 },
    ];
    expect(cagrPct(points)).toBe(0);
  });

  it("returns zero for a wiped-out account rather than a bogus rate", () => {
    const points: EquityPoint[] = [
      { ts: new Date(Date.UTC(2020, 0, 1)), equity: 100 },
      { ts: new Date(Date.UTC(2024, 0, 1)), equity: 0 },
    ];
    expect(cagrPct(points)).toBe(0);
  });
});

describe("maxDrawdownPct", () => {
  it("is zero for a monotonically rising curve", () => {
    expect(maxDrawdownPct(curve([100, 110, 120, 130]))).toBe(0);
  });

  it("measures peak to trough, not start to trough", () => {
    // Peak 200, trough 150 → 25%.
    expect(maxDrawdownPct(curve([100, 200, 150, 180]))).toBeCloseTo(25, 9);
  });

  it("keeps the worst drawdown when a later, smaller one occurs", () => {
    expect(maxDrawdownPct(curve([100, 200, 100, 220, 200]))).toBeCloseTo(50, 9);
  });

  it("handles a total loss", () => {
    expect(maxDrawdownPct(curve([100, 0]))).toBeCloseTo(100, 9);
  });
});

describe("sharpe / sortino", () => {
  it("returns 0 for a flat curve instead of dividing by zero", () => {
    expect(sharpe(curve([100, 100, 100, 100]))).toBe(0);
    expect(sortino(curve([100, 100, 100, 100]))).toBe(0);
  });

  it("is positive for a steadily rising curve", () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 * 1.001 ** i);
    expect(sharpe(curve(values))).toBeGreaterThan(0);
  });

  it("is negative for a steadily falling curve", () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 * 0.999 ** i);
    expect(sharpe(curve(values))).toBeLessThan(0);
  });

  it("sortino ignores upside volatility, so it exceeds sharpe when losses are rare", () => {
    // Mostly small gains with a couple of small losses.
    const values = [100];
    for (let i = 1; i < 60; i++) {
      values.push(values[i - 1] * (i % 20 === 0 ? 0.99 : 1.004));
    }
    const s = sharpe(curve(values));
    const so = sortino(curve(values));
    expect(so).toBeGreaterThan(s);
  });

  it("returns 0 when there are too few points to have a distribution", () => {
    expect(sharpe(curve([100]))).toBe(0);
    expect(sharpe([])).toBe(0);
  });
});

describe("trade statistics", () => {
  const trades = [
    { pnl: 100, returnPct: 10 },
    { pnl: -50, returnPct: -5 },
    { pnl: 200, returnPct: 20 },
    { pnl: -25, returnPct: -2.5 },
  ];

  it("computes win rate", () => {
    expect(winRatePct(trades)).toBeCloseTo(50, 9);
    expect(winRatePct([])).toBe(0);
  });

  it("does not count a scratch trade as a win", () => {
    expect(winRatePct([{ pnl: 0, returnPct: 0 }])).toBe(0);
  });

  it("computes profit factor as gross profit over gross loss", () => {
    expect(profitFactor(trades)).toBeCloseTo(300 / 75, 9);
  });

  it("reports Infinity when there are no losses, and clamps it for storage", () => {
    const winners = [{ pnl: 10, returnPct: 1 }];
    expect(profitFactor(winners)).toBe(Infinity);
    // Postgres cannot store Infinity in a float column, so persistence clamps.
    expect(finiteProfitFactor(winners)).toBe(9999);
    expect(Number.isFinite(finiteProfitFactor(winners))).toBe(true);
  });

  it("reports 0 profit factor when there are no trades at all", () => {
    expect(profitFactor([])).toBe(0);
    expect(finiteProfitFactor([])).toBe(0);
  });

  it("computes expectancy as mean P&L per trade", () => {
    expect(expectancy(trades)).toBeCloseTo(225 / 4, 9);
    expect(expectancy([])).toBe(0);
  });
});

describe("summarise", () => {
  it("packages every metric and never emits a non-finite number", () => {
    const s = summarise(curve([100, 120, 90, 140]), [
      { pnl: 40, returnPct: 40 },
      { pnl: -10, returnPct: -10 },
    ]);
    expect(s.tradeCount).toBe(2);
    expect(s.finalEquity).toBe(140);
    for (const [key, value] of Object.entries(s)) {
      expect(Number.isFinite(value), `${key} should be finite`).toBe(true);
    }
  });

  it("survives an empty backtest without throwing", () => {
    const s = summarise([], []);
    expect(s.tradeCount).toBe(0);
    expect(s.finalEquity).toBe(0);
    expect(s.maxDrawdownPct).toBe(0);
  });
});
