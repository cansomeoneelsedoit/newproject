/**
 * Position accounting on an average-cost basis.
 *
 * This is the single most correctness-critical file in Kronos: both the paper
 * trading engine and the backtester run every fill through `applyFill`, so an
 * error here silently corrupts every P&L number in the product.
 *
 * Conventions:
 * - `quantity > 0` is long, `quantity < 0` is short, `0` is flat.
 * - `avgCost` is the average entry price of the CURRENT open quantity. It is
 *   meaningless (and reported as 0) when flat.
 * - Realised P&L is booked only when quantity is reduced or closed. Adding to a
 *   position never realises anything; it re-averages the cost.
 * - A fill that crosses through zero (e.g. selling 150 while long 100) is split
 *   internally: close the existing 100, then open a new short 50 at the fill
 *   price. This is the behaviour brokers exhibit and the one that keeps
 *   `avgCost` meaningful.
 */

export type Position = {
  quantity: number;
  avgCost: number;
  realizedPnl: number;
};

export type Fill = {
  /** Positive to buy, negative to sell. */
  quantity: number;
  price: number;
  /** Commission in currency, always a cost (subtracted from realised P&L). */
  commission?: number;
};

export const FLAT: Position = { quantity: 0, avgCost: 0, realizedPnl: 0 };

/**
 * Apply a fill to a position, returning the new position.
 *
 * Pure: the input position is never mutated.
 */
export function applyFill(position: Position, fill: Fill): Position {
  const commission = fill.commission ?? 0;
  if (fill.quantity === 0) {
    // A zero-quantity fill still costs commission if a venue charged one.
    return { ...position, realizedPnl: position.realizedPnl - commission };
  }

  const oldQty = position.quantity;
  const newQtyRaw = oldQty + fill.quantity;

  // Opening from flat, or adding in the same direction: re-average, realise nothing.
  if (oldQty === 0 || Math.sign(oldQty) === Math.sign(fill.quantity)) {
    const totalCost = Math.abs(oldQty) * position.avgCost + Math.abs(fill.quantity) * fill.price;
    const totalQty = Math.abs(newQtyRaw);
    return {
      quantity: newQtyRaw,
      avgCost: totalQty === 0 ? 0 : totalCost / totalQty,
      realizedPnl: position.realizedPnl - commission,
    };
  }

  // Reducing, closing, or flipping.
  const closingQty = Math.min(Math.abs(fill.quantity), Math.abs(oldQty));
  // Long: profit when the exit price exceeds cost. Short: the reverse.
  const direction = oldQty > 0 ? 1 : -1;
  const realized = closingQty * (fill.price - position.avgCost) * direction;

  if (Math.abs(fill.quantity) <= Math.abs(oldQty)) {
    // Partial close or exact close — the remainder keeps the original cost basis.
    const remaining = newQtyRaw;
    return {
      quantity: remaining,
      avgCost: remaining === 0 ? 0 : position.avgCost,
      realizedPnl: position.realizedPnl + realized - commission,
    };
  }

  // Flip: the excess opens a new position on the other side at the fill price.
  const excess = Math.abs(fill.quantity) - Math.abs(oldQty);
  return {
    quantity: Math.sign(fill.quantity) * excess,
    avgCost: fill.price,
    realizedPnl: position.realizedPnl + realized - commission,
  };
}

/** Mark-to-market profit on the open quantity at `price`. Flat means zero. */
export function unrealizedPnl(position: Position, price: number): number {
  if (position.quantity === 0) return 0;
  return (price - position.avgCost) * position.quantity;
}

/** Signed notional of the open position at `price`. */
export function marketValue(position: Position, price: number): number {
  return position.quantity * price;
}

/**
 * Total account equity: cash plus the mark-to-market value of every position.
 *
 * Note this treats a short as negative market value, which is the convention
 * that makes equity fall when a short moves against you.
 */
export function accountEquity(
  cash: number,
  positions: { position: Position; price: number }[],
): number {
  return positions.reduce((acc, p) => acc + marketValue(p.position, p.price), cash);
}

/**
 * Cash effect of a fill: buying spends cash, selling raises it, and commission
 * is always a cost.
 */
export function cashDelta(fill: Fill): number {
  return -(fill.quantity * fill.price) - (fill.commission ?? 0);
}

/**
 * Commission for a trade, quoted in basis points of notional.
 * 10 bps on $10,000 of stock is $10.
 */
export function commissionFor(quantity: number, price: number, bps: number): number {
  return Math.abs(quantity * price) * (bps / 10_000);
}

/**
 * Price after slippage, in basis points against the trader: buys fill higher,
 * sells fill lower. Modelling this matters — a backtest without it will happily
 * report profits that evaporate in live trading.
 */
export function slippedPrice(price: number, side: "BUY" | "SELL", bps: number): number {
  const factor = 1 + (side === "BUY" ? bps : -bps) / 10_000;
  return price * factor;
}

/**
 * Position size from a fixed-fractional risk rule: risk `riskPct` of equity,
 * with the stop `stopDistance` away in price terms.
 *
 * Returns 0 when the stop distance is non-positive — without a stop there is no
 * defined risk per unit, and guessing one would silently size the trade wrong.
 */
export function sizeByRisk(
  equity: number,
  riskPct: number,
  stopDistance: number,
): number {
  if (stopDistance <= 0 || equity <= 0 || riskPct <= 0) return 0;
  return (equity * (riskPct / 100)) / stopDistance;
}
