/**
 * Validation: out-of-sample holdout, walk-forward, and acceptance gates.
 *
 * The backtester tells you what happened. This tells you whether to believe it.
 *
 * A backtest on its own is close to worthless: given enough strategies and
 * enough parameter sweeps, something will look excellent purely by chance. This
 * module exists to make that harder — by holding data back, by testing across
 * separate stretches of time, and by refusing results that pattern-match to
 * overfitting or to a bug.
 *
 * The cardinal rule, and the reason this file is written the way it is:
 *
 *   **Walk-forward windows must never touch the out-of-sample holdout.**
 *
 * That sounds obvious and is very easy to get wrong. If you slice walk-forward
 * windows off the tail of the *full* series while also reserving the tail as a
 * holdout, every window lands inside the holdout — so by the time you "finally"
 * score out-of-sample, you have already made decisions against that data and it
 * is no longer out of sample. `walkForward` therefore takes the in-sample
 * slice, and `splitSample` is the only thing that ever sees the tail.
 */

import type { Candle } from "./indicators";
import type { EquityPoint } from "./metrics";

/** Fraction of history reserved as the untouched holdout. */
export const DEFAULT_OOS_FRACTION = 0.3;

export type Sample<T> = {
  inSample: T[];
  outOfSample: T[];
  /** Index in the original series where the holdout begins. */
  splitIndex: number;
};

/**
 * Chronological split. Never random: shuffling time series leaks the future
 * into the past, which is the most common way a backtest lies.
 */
export function splitSample<T>(rows: T[], oosFraction = DEFAULT_OOS_FRACTION): Sample<T> {
  if (oosFraction <= 0 || oosFraction >= 1) {
    throw new Error("oosFraction must be between 0 and 1 exclusive");
  }
  const splitIndex = Math.floor(rows.length * (1 - oosFraction));
  return {
    inSample: rows.slice(0, splitIndex),
    outOfSample: rows.slice(splitIndex),
    splitIndex,
  };
}

export type WalkForwardWindow = {
  window: number;
  from: Date;
  to: Date;
  bars: number;
  totalReturnPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  tradeCount: number;
  winRatePct: number;
};

/**
 * Carve `count` consecutive, non-overlapping test windows out of a series.
 *
 * Callers pass the IN-SAMPLE slice. The windows tile the tail of whatever they
 * are given, so handing this the full series is exactly the contamination bug
 * described at the top of this file.
 *
 * Returns index ranges rather than running anything, so it can be unit-tested
 * as pure arithmetic and reused by callers that own their own execution.
 */
export function walkForwardRanges(
  length: number,
  count = 5,
  coverage = 0.5,
): { start: number; end: number }[] {
  if (count < 1) return [];
  const windowLen = Math.floor((length * coverage) / count);
  if (windowLen < 2) return [];

  const ranges: { start: number; end: number }[] = [];
  for (let w = 0; w < count; w++) {
    const start = length - (count - w) * windowLen;
    if (start < 0) continue;
    ranges.push({ start, end: start + windowLen });
  }
  return ranges;
}

export type WindowRunner = (
  candles: Candle[],
) => { equityCurve: EquityPoint[]; summary: { totalReturnPct: number; sharpe: number; maxDrawdownPct: number; tradeCount: number; winRatePct: number } };

/**
 * Run a strategy across successive slices of the in-sample data.
 *
 * One good backtest over one stretch of history proves very little — a single
 * favourable regime can carry it. Consistency across separate stretches is
 * weaker evidence than a true forward test, but it is much harder to fake.
 */
export function walkForward(
  inSample: Candle[],
  run: WindowRunner,
  count = 5,
  coverage = 0.5,
): WalkForwardWindow[] {
  const ranges = walkForwardRanges(inSample.length, count, coverage);
  const out: WalkForwardWindow[] = [];

  ranges.forEach((r, i) => {
    const slice = inSample.slice(r.start, r.end);
    if (slice.length < 2) return;
    const res = run(slice);
    out.push({
      window: i + 1,
      from: slice[0].ts,
      to: slice[slice.length - 1].ts,
      bars: slice.length,
      totalReturnPct: res.summary.totalReturnPct,
      sharpe: res.summary.sharpe,
      maxDrawdownPct: res.summary.maxDrawdownPct,
      tradeCount: res.summary.tradeCount,
      winRatePct: res.summary.winRatePct,
    });
  });

  return out;
}

export type WalkForwardVerdict = {
  passed: boolean;
  profitableWindowPct: number;
  worstWindowReturnPct: number;
  worstWindowDrawdownPct: number;
  reason: string;
};

/**
 * A strategy passes walk-forward if most windows made money AND no single
 * window was catastrophic. Both halves matter: an average can hide a stretch
 * that would have taken the account out before the good years arrived.
 */
export function walkForwardVerdict(
  windows: WalkForwardWindow[],
  minProfitablePct = 60,
  maxWindowDrawdownPct = -40,
): WalkForwardVerdict {
  if (windows.length === 0) {
    return {
      passed: false,
      profitableWindowPct: 0,
      worstWindowReturnPct: 0,
      worstWindowDrawdownPct: 0,
      reason: "No walk-forward windows could be produced — not enough history.",
    };
  }

  const profitable = windows.filter((w) => w.totalReturnPct > 0).length;
  const profitablePct = (profitable / windows.length) * 100;
  const worstReturn = Math.min(...windows.map((w) => w.totalReturnPct));
  const worstDd = Math.min(...windows.map((w) => w.maxDrawdownPct));

  if (profitablePct < minProfitablePct) {
    return {
      passed: false,
      profitableWindowPct: profitablePct,
      worstWindowReturnPct: worstReturn,
      worstWindowDrawdownPct: worstDd,
      reason: `Only ${profitablePct.toFixed(0)}% of windows were profitable (needs ${minProfitablePct}%).`,
    };
  }
  if (worstDd < maxWindowDrawdownPct) {
    return {
      passed: false,
      profitableWindowPct: profitablePct,
      worstWindowReturnPct: worstReturn,
      worstWindowDrawdownPct: worstDd,
      reason: `One window drew down ${worstDd.toFixed(0)}%, worse than the ${maxWindowDrawdownPct}% limit.`,
    };
  }
  return {
    passed: true,
    profitableWindowPct: profitablePct,
    worstWindowReturnPct: worstReturn,
    worstWindowDrawdownPct: worstDd,
    reason: `${profitablePct.toFixed(0)}% of windows profitable, worst drawdown ${worstDd.toFixed(1)}%.`,
  };
}

/**
 * Thresholds a result must clear to be taken seriously.
 *
 * The upper bound on profit factor is not a typo. A profit factor above ~4 on
 * retail-timeframe data is far more often a look-ahead bug than an edge, and
 * the same goes for a win rate above 90%. Treating "too good" as a failure is
 * the single highest-value rule here.
 */
export type AcceptanceRules = {
  minTrades: number;
  minProfitFactor: number;
  maxProfitFactor: number;
  maxDrawdownPct: number;
  minSharpe: number;
  maxWinRatePct: number;
  mustBeatBuyHold: boolean;
};

export const DEFAULT_RULES: AcceptanceRules = {
  minTrades: 30,
  minProfitFactor: 1.3,
  maxProfitFactor: 4,
  maxDrawdownPct: -35,
  minSharpe: 0.8,
  maxWinRatePct: 90,
  mustBeatBuyHold: false,
};

export type ScoredMetrics = {
  totalReturnPct: number;
  buyHoldReturnPct?: number;
  sharpe: number;
  maxDrawdownPct: number;
  profitFactor: number;
  tradeCount: number;
  winRatePct: number;
};

export type AcceptanceResult = { accepted: boolean; failures: string[] };

export function checkAcceptance(
  m: ScoredMetrics,
  rules: AcceptanceRules = DEFAULT_RULES,
): AcceptanceResult {
  const failures: string[] = [];

  if (m.tradeCount < rules.minTrades) {
    failures.push(
      `Only ${m.tradeCount} trades (needs ${rules.minTrades}) — too few to be statistically meaningful.`,
    );
  }
  if (m.profitFactor < rules.minProfitFactor) {
    failures.push(
      `Profit factor ${m.profitFactor.toFixed(2)} is below ${rules.minProfitFactor}.`,
    );
  }
  // Only meaningful when trades actually occurred; 0 trades already failed above.
  if (m.tradeCount > 0 && m.profitFactor > rules.maxProfitFactor) {
    failures.push(
      `Profit factor ${m.profitFactor.toFixed(2)} exceeds ${rules.maxProfitFactor} — suspiciously good, check for look-ahead or a bug.`,
    );
  }
  if (m.maxDrawdownPct < rules.maxDrawdownPct) {
    failures.push(
      `Max drawdown ${m.maxDrawdownPct.toFixed(1)}% is worse than the ${rules.maxDrawdownPct}% limit.`,
    );
  }
  if (m.sharpe < rules.minSharpe) {
    failures.push(`Sharpe ${m.sharpe.toFixed(2)} is below ${rules.minSharpe}.`);
  }
  if (m.tradeCount > 0 && m.winRatePct > rules.maxWinRatePct) {
    failures.push(
      `Win rate ${m.winRatePct.toFixed(1)}% exceeds ${rules.maxWinRatePct}% — almost always look-ahead rather than skill.`,
    );
  }
  if (
    rules.mustBeatBuyHold &&
    m.buyHoldReturnPct !== undefined &&
    m.totalReturnPct <= m.buyHoldReturnPct
  ) {
    failures.push(
      `Returned ${m.totalReturnPct.toFixed(1)}% against buy & hold's ${m.buyHoldReturnPct.toFixed(1)}% — not worth the risk or the fees.`,
    );
  }

  return { accepted: failures.length === 0, failures };
}

export type Verdict = {
  accepted: boolean;
  inSample: AcceptanceResult;
  walkForward: WalkForwardVerdict;
  outOfSample: AcceptanceResult;
  /** One-line plain-English summary for the UI. */
  summary: string;
  failures: string[];
};

/**
 * Combine the three gates. A strategy is only accepted if it clears all of
 * them — in-sample quality, consistency across windows, and holdout
 * performance. Failing any one is a rejection, and the reasons are kept so the
 * UI can say precisely why rather than showing a bare red badge.
 */
export function finalVerdict(
  inSample: AcceptanceResult,
  walkForward: WalkForwardVerdict,
  outOfSample: AcceptanceResult,
): Verdict {
  const failures = [
    ...inSample.failures.map((f) => `In-sample: ${f}`),
    ...(walkForward.passed ? [] : [`Walk-forward: ${walkForward.reason}`]),
    ...outOfSample.failures.map((f) => `Out-of-sample: ${f}`),
  ];
  const accepted = inSample.accepted && walkForward.passed && outOfSample.accepted;

  return {
    accepted,
    inSample,
    walkForward,
    outOfSample,
    failures,
    summary: accepted
      ? "Passed all three gates: in-sample quality, walk-forward consistency, and the held-out period."
      : `Rejected on ${failures.length} ${failures.length === 1 ? "count" : "counts"}.`,
  };
}
