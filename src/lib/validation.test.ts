import { describe, expect, it } from "vitest";

import {
  DEFAULT_RULES,
  checkAcceptance,
  finalVerdict,
  splitSample,
  walkForward,
  walkForwardRanges,
  walkForwardVerdict,
  type WalkForwardWindow,
} from "./validation";
import type { Candle } from "./indicators";

function mkCandles(n: number): Candle[] {
  return Array.from({ length: n }, (_, i) => ({
    ts: new Date(Date.UTC(2021, 0, 1 + i)),
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 1000,
  }));
}

describe("splitSample", () => {
  it("splits chronologically, holdout last", () => {
    const s = splitSample(mkCandles(100), 0.3);
    expect(s.inSample).toHaveLength(70);
    expect(s.outOfSample).toHaveLength(30);
    expect(s.splitIndex).toBe(70);
    // The holdout must come strictly after the in-sample period.
    expect(s.outOfSample[0].ts.getTime()).toBeGreaterThan(
      s.inSample[s.inSample.length - 1].ts.getTime(),
    );
  });

  it("never reorders or drops rows", () => {
    const rows = mkCandles(57);
    const s = splitSample(rows, 0.3);
    expect([...s.inSample, ...s.outOfSample]).toEqual(rows);
  });

  it("rejects a nonsensical fraction", () => {
    expect(() => splitSample(mkCandles(10), 0)).toThrow();
    expect(() => splitSample(mkCandles(10), 1)).toThrow();
  });
});

describe("walkForwardRanges — the contamination regression", () => {
  // This is the bug found in the Python original: walk-forward windows were
  // carved off the tail of the FULL series while the tail was simultaneously
  // reserved as the sacred holdout, so 100% of walk-forward test bars sat
  // inside the holdout. The API here only ever receives the in-sample slice;
  // this test pins that invariant.
  it("keeps every window strictly inside the in-sample slice", () => {
    for (const total of [2064, 1000, 500, 240]) {
      const { inSample, splitIndex } = splitSample(mkCandles(total), 0.3);
      const ranges = walkForwardRanges(inSample.length, 5, 0.5);

      expect(ranges.length).toBeGreaterThan(0);
      for (const r of ranges) {
        expect(r.start).toBeGreaterThanOrEqual(0);
        // The decisive assertion: no window may reach into the holdout.
        expect(r.end).toBeLessThanOrEqual(inSample.length);
        expect(r.end).toBeLessThanOrEqual(splitIndex);
      }
    }
  });

  it("produces non-overlapping, consecutive windows", () => {
    const ranges = walkForwardRanges(700, 5, 0.5);
    expect(ranges).toHaveLength(5);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].start).toBe(ranges[i - 1].end);
    }
  });

  it("returns nothing when there is too little history to slice", () => {
    expect(walkForwardRanges(8, 5, 0.5)).toEqual([]);
    expect(walkForwardRanges(100, 0, 0.5)).toEqual([]);
  });
});

describe("walkForward", () => {
  const runner = (candles: Candle[]) => ({
    equityCurve: candles.map((c) => ({ ts: c.ts, equity: c.close })),
    summary: {
      totalReturnPct: 5,
      sharpe: 1.1,
      maxDrawdownPct: -8,
      tradeCount: 12,
      winRatePct: 55,
    },
  });

  it("reports one row per window with real date bounds", () => {
    const { inSample } = splitSample(mkCandles(1000), 0.3);
    const windows = walkForward(inSample, runner, 5, 0.5);
    expect(windows).toHaveLength(5);
    expect(windows[0].window).toBe(1);
    for (const w of windows) {
      expect(w.bars).toBeGreaterThan(1);
      expect(w.to.getTime()).toBeGreaterThan(w.from.getTime());
    }
    // Windows must advance through time, not repeat the same stretch.
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].from.getTime()).toBeGreaterThan(windows[i - 1].from.getTime());
    }
  });

  it("never runs a window past the data it was given", () => {
    const { inSample } = splitSample(mkCandles(400), 0.3);
    const last = inSample[inSample.length - 1].ts.getTime();
    for (const w of walkForward(inSample, runner, 5, 0.5)) {
      expect(w.to.getTime()).toBeLessThanOrEqual(last);
    }
  });
});

describe("walkForwardVerdict", () => {
  const mk = (returns: number[], dds?: number[]): WalkForwardWindow[] =>
    returns.map((r, i) => ({
      window: i + 1,
      from: new Date(Date.UTC(2021, 0, 1 + i)),
      to: new Date(Date.UTC(2021, 1, 1 + i)),
      bars: 30,
      totalReturnPct: r,
      sharpe: 1,
      maxDrawdownPct: dds ? dds[i] : -10,
      tradeCount: 10,
      winRatePct: 50,
    }));

  it("passes when most windows profit and none blow up", () => {
    const v = walkForwardVerdict(mk([5, 8, -2, 4, 6]));
    expect(v.passed).toBe(true);
    expect(v.profitableWindowPct).toBe(80);
  });

  it("fails when too few windows are profitable", () => {
    const v = walkForwardVerdict(mk([5, -3, -2, -4, 6]));
    expect(v.passed).toBe(false);
    expect(v.reason).toMatch(/40% of windows/);
  });

  it("fails on a single catastrophic window even when the majority profit", () => {
    // This is the case a headline average hides.
    const v = walkForwardVerdict(mk([9, 8, 7, 6, -38], [-5, -5, -5, -5, -55]));
    expect(v.passed).toBe(false);
    expect(v.reason).toMatch(/drew down/);
    expect(v.worstWindowDrawdownPct).toBe(-55);
  });

  it("fails when no windows exist rather than passing vacuously", () => {
    const v = walkForwardVerdict([]);
    expect(v.passed).toBe(false);
    expect(v.reason).toMatch(/not enough history/i);
  });
});

describe("checkAcceptance", () => {
  const good = {
    totalReturnPct: 40,
    buyHoldReturnPct: 20,
    sharpe: 1.4,
    maxDrawdownPct: -18,
    profitFactor: 1.9,
    tradeCount: 60,
    winRatePct: 52,
  };

  it("accepts a plausible result", () => {
    const r = checkAcceptance(good);
    expect(r.accepted).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it("rejects too few trades as statistically meaningless", () => {
    const r = checkAcceptance({ ...good, tradeCount: 12 });
    expect(r.accepted).toBe(false);
    expect(r.failures[0]).toMatch(/statistically meaningful/);
  });

  it("rejects results that are TOO good — the look-ahead smell", () => {
    const suspicious = checkAcceptance({ ...good, profitFactor: 9 });
    expect(suspicious.accepted).toBe(false);
    expect(suspicious.failures.join(" ")).toMatch(/look-ahead or a bug/);

    const perfect = checkAcceptance({ ...good, winRatePct: 97 });
    expect(perfect.accepted).toBe(false);
    expect(perfect.failures.join(" ")).toMatch(/look-ahead rather than skill/);
  });

  it("rejects deep drawdowns and weak risk-adjusted returns", () => {
    expect(checkAcceptance({ ...good, maxDrawdownPct: -60 }).accepted).toBe(false);
    expect(checkAcceptance({ ...good, sharpe: 0.2 }).accepted).toBe(false);
  });

  it("does not fire the too-good rules when there were no trades at all", () => {
    // A zero-trade run already fails on trade count; it must not also be
    // accused of look-ahead, which would be a confusing lie.
    const r = checkAcceptance({ ...good, tradeCount: 0, profitFactor: 0, winRatePct: 0 });
    expect(r.accepted).toBe(false);
    expect(r.failures.join(" ")).not.toMatch(/look-ahead/);
  });

  it("can require beating buy and hold when asked", () => {
    const rules = { ...DEFAULT_RULES, mustBeatBuyHold: true };
    const r = checkAcceptance({ ...good, totalReturnPct: 10, buyHoldReturnPct: 90 }, rules);
    expect(r.accepted).toBe(false);
    expect(r.failures.join(" ")).toMatch(/buy & hold/);
  });

  it("collects every reason, not just the first", () => {
    const r = checkAcceptance({
      ...good,
      tradeCount: 3,
      sharpe: 0.1,
      maxDrawdownPct: -70,
    });
    expect(r.failures.length).toBeGreaterThanOrEqual(3);
  });
});

describe("finalVerdict", () => {
  const pass = { accepted: true, failures: [] };
  const wfPass = {
    passed: true,
    profitableWindowPct: 80,
    worstWindowReturnPct: -2,
    worstWindowDrawdownPct: -9,
    reason: "fine",
  };

  it("accepts only when all three gates pass", () => {
    expect(finalVerdict(pass, wfPass, pass).accepted).toBe(true);
  });

  it("rejects if the holdout fails even when in-sample looked great", () => {
    const oosFail = { accepted: false, failures: ["Sharpe 0.10 is below 0.8."] };
    const v = finalVerdict(pass, wfPass, oosFail);
    expect(v.accepted).toBe(false);
    expect(v.failures[0]).toMatch(/^Out-of-sample:/);
  });

  it("rejects if walk-forward fails even when both ends look fine", () => {
    const wfFail = { ...wfPass, passed: false, reason: "only 20% of windows profitable" };
    const v = finalVerdict(pass, wfFail, pass);
    expect(v.accepted).toBe(false);
    expect(v.failures[0]).toMatch(/^Walk-forward:/);
  });

  it("labels every failure with the gate it came from", () => {
    const v = finalVerdict(
      { accepted: false, failures: ["a"] },
      { ...wfPass, passed: false, reason: "b" },
      { accepted: false, failures: ["c"] },
    );
    expect(v.failures).toHaveLength(3);
    expect(v.failures[0]).toMatch(/^In-sample:/);
    expect(v.failures[1]).toMatch(/^Walk-forward:/);
    expect(v.failures[2]).toMatch(/^Out-of-sample:/);
    expect(v.summary).toMatch(/Rejected on 3 counts/);
  });
});
