/**
 * Backtest engine.
 *
 * Execution model, stated explicitly because it is what makes a backtest
 * honest or useless:
 *
 * 1. A strategy decides the target position for bar `i` using bars `0..i`.
 * 2. That target is executed at **bar `i+1`'s open**, with slippage and
 *    commission applied. You cannot trade a bar's close using information only
 *    available at that close, so filling on the next open is the earliest
 *    defensible fill.
 * 3. Equity is marked at each bar's close.
 *
 * The final bar's target is therefore never executed — there is no `i+1` to
 * fill it on — and any position still open at the end is closed at the last
 * bar's close so P&L is fully realised in the reported trade list.
 */

import type { Candle } from "./indicators";
import { runStrategy, type StrategyKind, type TargetSide } from "./strategies";
import {
  applyFill,
  cashDelta,
  commissionFor,
  slippedPrice,
  unrealizedPnl,
  type Position,
} from "./portfolio";
import { summarise, type ClosedTrade, type EquityPoint, type Summary } from "./metrics";

export type BacktestConfig = {
  initialCash: number;
  /** Commission per side, in basis points of notional. */
  commissionBps: number;
  /** Slippage per side, in basis points, always against the trader. */
  slippageBps: number;
  /**
   * Fraction of equity to deploy when a target is non-zero, 0..1.
   * 1 means "use all available equity", which is the default for a
   * single-instrument test.
   */
  exposure: number;
};

export const DEFAULT_CONFIG: BacktestConfig = {
  initialCash: 100_000,
  commissionBps: 5,
  slippageBps: 2,
  exposure: 1,
};

export type BacktestTrade = {
  side: "BUY" | "SELL";
  quantity: number;
  entryTs: Date;
  entryPrice: number;
  exitTs: Date | null;
  exitPrice: number | null;
  pnl: number;
  returnPct: number;
  exitReason: string;
};

export type BacktestResult = {
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
  summary: Summary;
  config: BacktestConfig;
};

/** Tracks the currently open round-trip so it can be emitted when closed. */
type OpenTrade = {
  side: "BUY" | "SELL";
  quantity: number;
  entryTs: Date;
  entryPrice: number;
  /** Realised P&L on the position at the moment this trade was opened. */
  realizedAtEntry: number;
};

export function backtest(
  kind: StrategyKind,
  candles: Candle[],
  params: unknown,
  configOverrides: Partial<BacktestConfig> = {},
): BacktestResult {
  const config: BacktestConfig = { ...DEFAULT_CONFIG, ...configOverrides };
  const targets = runStrategy(kind, candles, params);

  let cash = config.initialCash;
  let position: Position = { quantity: 0, avgCost: 0, realizedPnl: 0 };
  let open: OpenTrade | null = null;

  const equityCurve: EquityPoint[] = [];
  const trades: BacktestTrade[] = [];

  const closeTrade = (exitTs: Date, exitPrice: number, reason: string) => {
    if (!open) return;
    const pnl = position.realizedPnl - open.realizedAtEntry;
    const notional = Math.abs(open.quantity * open.entryPrice);
    trades.push({
      side: open.side,
      quantity: Math.abs(open.quantity),
      entryTs: open.entryTs,
      entryPrice: open.entryPrice,
      exitTs,
      exitPrice,
      pnl,
      returnPct: notional === 0 ? 0 : (pnl / notional) * 100,
      exitReason: reason,
    });
    open = null;
  };

  for (let i = 0; i < candles.length; i++) {
    // --- Execute the PREVIOUS bar's target at this bar's open ---------------
    if (i > 0) {
      const desired: TargetSide = targets[i - 1].target;
      const currentSide: TargetSide =
        position.quantity > 0 ? 1 : position.quantity < 0 ? -1 : 0;

      if (desired !== currentSide) {
        const openPx = candles[i].open;

        // Close whatever is open first, so each round-trip is reported cleanly.
        if (position.quantity !== 0) {
          const side = position.quantity > 0 ? "SELL" : "BUY";
          const px = slippedPrice(openPx, side, config.slippageBps);
          const qty = -position.quantity;
          const commission = commissionFor(qty, px, config.commissionBps);
          cash += cashDelta({ quantity: qty, price: px, commission });
          position = applyFill(position, { quantity: qty, price: px, commission });
          closeTrade(candles[i].ts, px, desired === 0 ? "Signal flat" : "Signal reversed");
        }

        // Then open the new side, if any.
        if (desired !== 0) {
          const side = desired > 0 ? "BUY" : "SELL";
          const px = slippedPrice(openPx, side, config.slippageBps);
          const equityNow = cash; // flat at this point, so equity is just cash
          const budget = Math.max(0, equityNow * config.exposure);
          // Size so that notional + commission fits the budget, avoiding a
          // negative cash balance from the commission on a fully-invested buy.
          const perUnit = px * (1 + config.commissionBps / 10_000);
          const qtyAbs = perUnit > 0 ? budget / perUnit : 0;

          if (qtyAbs > 0) {
            const qty = desired > 0 ? qtyAbs : -qtyAbs;
            const commission = commissionFor(qty, px, config.commissionBps);
            cash += cashDelta({ quantity: qty, price: px, commission });
            position = applyFill(position, { quantity: qty, price: px, commission });
            open = {
              side,
              quantity: qty,
              entryTs: candles[i].ts,
              entryPrice: px,
              realizedAtEntry: position.realizedPnl,
            };
          }
        }
      }
    }

    // --- Mark to market at this bar's close ---------------------------------
    const close = candles[i].close;
    equityCurve.push({
      ts: candles[i].ts,
      equity: cash + position.quantity * close,
    });
  }

  // --- Close any residual position at the last close -------------------------
  if (position.quantity !== 0 && candles.length > 0) {
    const last = candles[candles.length - 1];
    const side = position.quantity > 0 ? "SELL" : "BUY";
    const px = slippedPrice(last.close, side, config.slippageBps);
    const qty = -position.quantity;
    const commission = commissionFor(qty, px, config.commissionBps);
    cash += cashDelta({ quantity: qty, price: px, commission });
    position = applyFill(position, { quantity: qty, price: px, commission });
    closeTrade(last.ts, px, "End of backtest");
    // Rewrite the final equity point now the position is flat, so the curve's
    // last value matches the realised cash balance.
    equityCurve[equityCurve.length - 1] = { ts: last.ts, equity: cash };
  }

  const closed: ClosedTrade[] = trades.map((t) => ({ pnl: t.pnl, returnPct: t.returnPct }));

  return { equityCurve, trades, summary: summarise(equityCurve, closed), config };
}

/**
 * Buy-and-hold over the same window, for comparison. A strategy that cannot
 * beat this is not worth its commission — the UI shows them side by side.
 */
export function buyAndHold(candles: Candle[], initialCash: number): EquityPoint[] {
  if (candles.length === 0) return [];
  const entry = candles[0].open;
  if (entry <= 0) return candles.map((c) => ({ ts: c.ts, equity: initialCash }));
  const qty = initialCash / entry;
  return candles.map((c) => ({ ts: c.ts, equity: qty * c.close }));
}

/** Current open-position P&L, exposed for the paper-trading dashboard. */
export { unrealizedPnl };
