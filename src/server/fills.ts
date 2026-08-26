/**
 * The single paper-fill path.
 *
 * Both entry points into the paper book — the Place order dialog and the
 * TradingView webhook — go through `settleOrder`. Keeping one implementation
 * matters more than the small amount of indirection it costs: two fill models
 * that drift apart would mean the backtest, the manual order and the automated
 * alert all disagree about what a trade was worth.
 *
 * Deliberately session-free. The caller resolves the organisation (through
 * `requireActiveOrgId()` or a webhook secret) and passes it in explicitly, so
 * this module never depends on a cookie.
 */

import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/prisma";
import {
  applyFill,
  cashDelta,
  commissionFor,
  slippedPrice,
  type Position as PositionState,
} from "@/lib/portfolio";
import { round } from "@/lib/format";

export type SettleInput = {
  organizationId: string;
  accountId: string;
  instrumentId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  limitPrice?: number | null;
  slippageBps: number;
  commissionBps: number;
};

export type SettleOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      orderId: string;
      status: "PENDING" | "FILLED" | "REJECTED";
      /** Null unless the order actually filled. */
      fillPrice: number | null;
      note: string | null;
      symbol: string;
    };

/**
 * Settle a paper order against the latest close.
 *
 * Fill model, stated plainly because a paper fill that flatters the trader is
 * worse than useless:
 * - MARKET fills at the last close, moved against the trader by `slippageBps`.
 * - LIMIT fills only if the last close is already at or through the limit, at
 *   the better of the limit and the slipped price. Otherwise it rests as
 *   PENDING rather than pretending to fill.
 * - Commission is charged in basis points of notional on every fill.
 *
 * Cash, position and order status are written in one transaction so they can
 * never disagree.
 */
export async function settleOrder(input: SettleInput): Promise<SettleOutcome> {
  const [account, instrument] = await Promise.all([
    prisma.account_.findFirst({
      where: { id: input.accountId, organizationId: input.organizationId },
      select: { id: true, cash: true },
    }),
    prisma.instrument.findFirst({
      where: { id: input.instrumentId, organizationId: input.organizationId },
      select: {
        id: true,
        symbol: true,
        candles: { orderBy: { ts: "desc" }, take: 1, select: { close: true, ts: true } },
      },
    }),
  ]);
  if (!account) return { ok: false, error: "Account not found" };
  if (!instrument) return { ok: false, error: "Instrument not found" };

  const lastClose = instrument.candles[0]?.close;
  if (lastClose === undefined) {
    return { ok: false, error: `No price history for ${instrument.symbol} — sync candles first` };
  }

  const signedQty = input.side === "BUY" ? input.quantity : -input.quantity;
  const slipped = slippedPrice(lastClose, input.side, input.slippageBps);

  // Decide whether this order fills at all.
  let fillPrice: number | null = null;
  let note: string | null = null;
  if (input.type === "MARKET") {
    fillPrice = slipped;
  } else {
    const limit = input.limitPrice as number;
    const marketable = input.side === "BUY" ? lastClose <= limit : lastClose >= limit;
    if (marketable) {
      // Never fill worse than the limit the trader specified.
      fillPrice = input.side === "BUY" ? Math.min(slipped, limit) : Math.max(slipped, limit);
    } else {
      note = `Resting: last close ${round(lastClose, 4)} has not reached the limit ${limit}`;
    }
  }

  const base = {
    organizationId: input.organizationId,
    accountId: account.id,
    instrumentId: instrument.id,
    side: input.side,
    type: input.type,
    quantity: input.quantity,
    limitPrice: input.limitPrice ?? null,
  };

  if (fillPrice === null) {
    const order = await prisma.order_.create({ data: { ...base, status: "PENDING", note } });
    return {
      ok: true,
      orderId: order.id,
      status: "PENDING",
      fillPrice: null,
      note,
      symbol: instrument.symbol,
    };
  }

  const commission = commissionFor(signedQty, fillPrice, input.commissionBps);
  const delta = cashDelta({ quantity: signedQty, price: fillPrice, commission });

  // Refuse a buy the account cannot fund. Shorts are allowed — this is a paper
  // book, and a short raises cash rather than spending it.
  if (delta < 0 && account.cash + delta < 0) {
    const shortfall = `Insufficient cash: need ${round(-delta, 2)}, have ${round(account.cash, 2)}`;
    const order = await prisma.order_.create({
      data: { ...base, status: "REJECTED", note: shortfall },
    });
    return {
      ok: true,
      orderId: order.id,
      status: "REJECTED",
      fillPrice: null,
      note: shortfall,
      symbol: instrument.symbol,
    };
  }

  const price = fillPrice;
  const orderId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.position.findFirst({
      where: {
        organizationId: input.organizationId,
        accountId: account.id,
        instrumentId: instrument.id,
      },
      select: { id: true, quantity: true, avgCost: true, realizedPnl: true },
    });

    const before: PositionState = existing
      ? { quantity: existing.quantity, avgCost: existing.avgCost, realizedPnl: existing.realizedPnl }
      : { quantity: 0, avgCost: 0, realizedPnl: 0 };

    const after = applyFill(before, { quantity: signedQty, price, commission });

    if (existing) {
      await tx.position.update({
        where: { id: existing.id },
        data: { quantity: after.quantity, avgCost: after.avgCost, realizedPnl: after.realizedPnl },
      });
    } else {
      await tx.position.create({
        data: {
          organizationId: input.organizationId,
          accountId: account.id,
          instrumentId: instrument.id,
          quantity: after.quantity,
          avgCost: after.avgCost,
          realizedPnl: after.realizedPnl,
        },
      });
    }

    await tx.account_.update({
      where: { id: account.id },
      data: { cash: account.cash + delta },
    });

    const order = await tx.order_.create({
      data: { ...base, status: "FILLED", filledPrice: round(price, 4), filledAt: new Date() },
    });
    return order.id;
  });

  return {
    ok: true,
    orderId,
    status: "FILLED",
    fillPrice: round(price, 4),
    note: null,
    symbol: instrument.symbol,
  };
}

/**
 * Current signed quantity held for an instrument in an account. Used by the
 * webhook to turn a "go long" signal into the delta that actually gets there,
 * so a repeated alert does not stack a second position on top of the first.
 */
export async function currentQuantity(
  organizationId: string,
  accountId: string,
  instrumentId: string,
): Promise<number> {
  const row = await prisma.position.findFirst({
    where: { organizationId, accountId, instrumentId },
    select: { quantity: true },
  });
  return row?.quantity ?? 0;
}
