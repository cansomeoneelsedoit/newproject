/**
 * Performance metrics for an equity curve and a set of closed trades.
 *
 * All percentage-returning functions return whole percents (12.5 means 12.5%),
 * not fractions — the UI never has to guess which convention it is looking at.
 */

import { stdev } from "./indicators";

export type EquityPoint = { ts: Date; equity: number };

export type ClosedTrade = {
  pnl: number;
  returnPct: number;
};

/** Trading days in a year; used to annualise daily-bar statistics. */
export const TRADING_DAYS_PER_YEAR = 252;

const MS_PER_YEAR = 365.25 * 86_400_000;

export function totalReturnPct(curve: EquityPoint[]): number {
  if (curve.length < 2) return 0;
  const first = curve[0].equity;
  if (first === 0) return 0;
  return ((curve[curve.length - 1].equity - first) / first) * 100;
}

/**
 * Compound annual growth rate.
 *
 * Returns 0 for a period shorter than a day or a non-positive start/end equity
 * — a blown-up account has no meaningful growth rate, and reporting a wild
 * number from a fractional-year denominator is worse than reporting nothing.
 */
export function cagrPct(curve: EquityPoint[]): number {
  if (curve.length < 2) return 0;
  const start = curve[0].equity;
  const end = curve[curve.length - 1].equity;
  if (start <= 0 || end <= 0) return 0;

  const years = (curve[curve.length - 1].ts.getTime() - curve[0].ts.getTime()) / MS_PER_YEAR;
  if (years <= 1 / 365) return 0;

  return ((end / start) ** (1 / years) - 1) * 100;
}

/**
 * Largest peak-to-trough decline, as a positive percentage.
 * A curve that only rises has a drawdown of 0.
 */
export function maxDrawdownPct(curve: EquityPoint[]): number {
  if (curve.length === 0) return 0;
  let peak = curve[0].equity;
  let worst = 0;
  for (const p of curve) {
    if (p.equity > peak) peak = p.equity;
    if (peak > 0) {
      const dd = ((peak - p.equity) / peak) * 100;
      if (dd > worst) worst = dd;
    }
  }
  return worst;
}

/**
 * Annualised Sharpe ratio from the equity curve's per-bar returns.
 *
 * `riskFreeRate` is an annual fraction (0.04 = 4%). Zero volatility returns 0
 * rather than Infinity: a flat curve is not an infinitely good strategy.
 */
export function sharpe(
  curve: EquityPoint[],
  riskFreeRate = 0,
  periodsPerYear = TRADING_DAYS_PER_YEAR,
): number {
  const rets = barReturns(curve);
  if (rets.length < 2) return 0;

  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = stdev(rets);
  if (sd === 0) return 0;

  const rfPerPeriod = riskFreeRate / periodsPerYear;
  return ((mean - rfPerPeriod) / sd) * Math.sqrt(periodsPerYear);
}

/**
 * Sortino ratio — like Sharpe but penalising only downside deviation.
 * With no losing periods there is no downside risk to divide by, so returns 0.
 */
export function sortino(
  curve: EquityPoint[],
  riskFreeRate = 0,
  periodsPerYear = TRADING_DAYS_PER_YEAR,
): number {
  const rets = barReturns(curve);
  if (rets.length < 2) return 0;

  const rfPerPeriod = riskFreeRate / periodsPerYear;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const downside = rets.filter((r) => r < rfPerPeriod).map((r) => r - rfPerPeriod);
  if (downside.length === 0) return 0;

  const dd = Math.sqrt(downside.reduce((acc, r) => acc + r * r, 0) / rets.length);
  if (dd === 0) return 0;
  return ((mean - rfPerPeriod) / dd) * Math.sqrt(periodsPerYear);
}

function barReturns(curve: EquityPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1].equity;
    if (prev <= 0) continue;
    out.push((curve[i].equity - prev) / prev);
  }
  return out;
}

/** Share of trades with positive P&L, as a percentage. */
export function winRatePct(trades: ClosedTrade[]): number {
  if (trades.length === 0) return 0;
  return (trades.filter((t) => t.pnl > 0).length / trades.length) * 100;
}

/**
 * Gross profit divided by gross loss.
 *
 * With no losing trades the ratio is undefined; we return `Infinity` so callers
 * can decide how to present it, rather than silently reporting a finite number
 * that implies losses occurred. Callers persisting this must clamp it — see
 * `finiteProfitFactor`.
 */
export function profitFactor(trades: ClosedTrade[]): number {
  const gross = trades.reduce(
    (acc, t) => {
      if (t.pnl >= 0) acc.profit += t.pnl;
      else acc.loss += -t.pnl;
      return acc;
    },
    { profit: 0, loss: 0 },
  );
  if (gross.loss === 0) return gross.profit === 0 ? 0 : Infinity;
  return gross.profit / gross.loss;
}

/**
 * Profit factor clamped to something a float column can hold. Postgres has no
 * representation for JS `Infinity`, so persisting the raw value throws.
 */
export function finiteProfitFactor(trades: ClosedTrade[], cap = 9999): number {
  const pf = profitFactor(trades);
  return Number.isFinite(pf) ? pf : cap;
}

/** Mean P&L per trade in currency terms. */
export function expectancy(trades: ClosedTrade[]): number {
  if (trades.length === 0) return 0;
  return trades.reduce((a, t) => a + t.pnl, 0) / trades.length;
}

export type Summary = {
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  sortino: number;
  winRatePct: number;
  profitFactor: number;
  expectancy: number;
  tradeCount: number;
  finalEquity: number;
};

export function summarise(
  curve: EquityPoint[],
  trades: ClosedTrade[],
  riskFreeRate = 0,
): Summary {
  return {
    totalReturnPct: totalReturnPct(curve),
    cagrPct: cagrPct(curve),
    maxDrawdownPct: maxDrawdownPct(curve),
    sharpe: sharpe(curve, riskFreeRate),
    sortino: sortino(curve, riskFreeRate),
    winRatePct: winRatePct(trades),
    profitFactor: finiteProfitFactor(trades),
    expectancy: expectancy(trades),
    tradeCount: trades.length,
    finalEquity: curve.length > 0 ? curve[curve.length - 1].equity : 0,
  };
}
