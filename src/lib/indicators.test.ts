import { describe, expect, it } from "vitest";

import {
  atr,
  bollinger,
  donchian,
  ema,
  macd,
  returns,
  rsi,
  sma,
  stdev,
  type Candle,
} from "./indicators";

/** Build candles from closes, with a configurable range around each close. */
function candlesFrom(closes: number[], spread = 1): Candle[] {
  return closes.map((c, i) => ({
    ts: new Date(Date.UTC(2026, 0, i + 1)),
    open: c,
    high: c + spread,
    low: c - spread,
    close: c,
    volume: 1000,
  }));
}

describe("sma", () => {
  it("is null through the warm-up period, then averages", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out).toEqual([null, null, 2, 3, 4]);
  });

  it("returns an array the same length as the input", () => {
    expect(sma([1, 2, 3], 2)).toHaveLength(3);
    expect(sma([1, 2, 3], 10)).toEqual([null, null, null]);
  });

  it("does not drift over a long series (rolling-sum sanity)", () => {
    const values = Array.from({ length: 500 }, (_, i) => Math.sin(i) * 100 + 1000);
    const out = sma(values, 50);
    const last = out[out.length - 1] as number;
    const expected = values.slice(-50).reduce((a, b) => a + b, 0) / 50;
    expect(last).toBeCloseTo(expected, 9);
  });

  it("rejects a non-positive period", () => {
    expect(() => sma([1, 2, 3], 0)).toThrow();
  });
});

describe("ema", () => {
  it("seeds from the SMA of the first period", () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).toBe(2); // SMA(1,2,3)
    // k = 2/(3+1) = 0.5 → 4*0.5 + 2*0.5 = 3
    expect(out[3]).toBe(3);
    expect(out[4]).toBe(4);
  });

  it("returns all nulls when there is less data than the period", () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
  });

  it("converges toward a constant series", () => {
    const out = ema(new Array(100).fill(42), 10);
    expect(out[99]).toBeCloseTo(42, 10);
  });
});

describe("rsi", () => {
  it("is 100 for a series that only rises", () => {
    const out = rsi([1, 2, 3, 4, 5, 6, 7, 8], 3);
    expect(out[3]).toBe(100);
    expect(out[7]).toBe(100);
  });

  it("is 0 for a series that only falls", () => {
    const out = rsi([8, 7, 6, 5, 4, 3, 2, 1], 3);
    expect(out[7]).toBe(0);
  });

  it("sits near 50 for a symmetric zig-zag", () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + (i % 2 === 0 ? -1 : 1));
    const out = rsi(values, 14);
    expect(out[59]).toBeGreaterThan(40);
    expect(out[59]).toBeLessThan(60);
  });

  it("stays within 0..100 on noisy data", () => {
    const values = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i * 1.7) * 30);
    for (const v of rsi(values, 14)) {
      if (v === null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("returns all nulls when data is shorter than the period", () => {
    expect(rsi([1, 2, 3], 14).every((v) => v === null)).toBe(true);
  });
});

describe("atr", () => {
  it("equals the bar range for a series with no gaps", () => {
    // Every close is identical, so true range is just high-low = 2.
    const out = atr(candlesFrom(new Array(30).fill(100), 1), 14);
    expect(out[29]).toBeCloseTo(2, 9);
  });

  it("accounts for gaps between bars", () => {
    const candles = candlesFrom([100, 120], 1);
    // Bar 1: high 121, low 119, prev close 100 → true range = 121-100 = 21.
    const out = atr(candles, 2);
    expect(out[1]).toBeCloseTo((2 + 21) / 2, 9);
  });
});

describe("macd", () => {
  it("keeps all three series aligned to the input length", () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 + i);
    const { macd: line, signal, histogram } = macd(values);
    expect(line).toHaveLength(100);
    expect(signal).toHaveLength(100);
    expect(histogram).toHaveLength(100);
  });

  it("is positive for a steadily rising series", () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 + i * 2);
    const { macd: line } = macd(values);
    expect(line[99] as number).toBeGreaterThan(0);
  });

  it("histogram equals macd minus signal wherever both are defined", () => {
    const values = Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 5) * 10);
    const { macd: line, signal, histogram } = macd(values);
    for (let i = 0; i < values.length; i++) {
      if (line[i] === null || signal[i] === null) {
        expect(histogram[i]).toBeNull();
      } else {
        expect(histogram[i] as number).toBeCloseTo((line[i] as number) - (signal[i] as number), 9);
      }
    }
  });

  it("rejects fast >= slow", () => {
    expect(() => macd([1, 2, 3], 26, 12)).toThrow();
  });
});

describe("bollinger", () => {
  it("collapses to the mean when the series is flat", () => {
    const { upper, middle, lower } = bollinger(new Array(40).fill(50), 20, 2);
    expect(middle[39]).toBeCloseTo(50, 9);
    expect(upper[39]).toBeCloseTo(50, 9);
    expect(lower[39]).toBeCloseTo(50, 9);
  });

  it("brackets the middle band symmetrically", () => {
    const values = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 5);
    const { upper, middle, lower } = bollinger(values, 20, 2);
    const i = 49;
    expect(upper[i] as number).toBeGreaterThan(middle[i] as number);
    expect(lower[i] as number).toBeLessThan(middle[i] as number);
    expect((upper[i] as number) - (middle[i] as number)).toBeCloseTo(
      (middle[i] as number) - (lower[i] as number),
      9,
    );
  });
});

describe("donchian", () => {
  it("excludes the current bar, so a new high is a genuine breakout", () => {
    const candles = candlesFrom([10, 11, 12, 13, 50], 0);
    const { upper } = donchian(candles, 4);
    // At i=4 the channel covers bars 0..3, whose highest high is 13 — not 50.
    expect(upper[4]).toBe(13);
    expect(candles[4].close).toBeGreaterThan(upper[4] as number);
  });

  it("is null until a full period of prior bars exists", () => {
    const { upper, lower } = donchian(candlesFrom([1, 2, 3, 4, 5], 0), 3);
    expect(upper[2]).toBeNull();
    expect(upper[3]).toBe(3);
    expect(lower[3]).toBe(1);
  });
});

describe("returns / stdev", () => {
  it("has a null first return", () => {
    expect(returns([100, 110])[0]).toBeNull();
    expect(returns([100, 110])[1]).toBeCloseTo(0.1, 12);
  });

  it("treats a zero previous value as a zero return rather than dividing by zero", () => {
    expect(returns([0, 5])[1]).toBe(0);
  });

  it("computes population standard deviation", () => {
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 9);
    expect(stdev([])).toBe(0);
    expect(stdev([3])).toBe(0);
  });
});
