import { describe, expect, it } from "vitest";

import {
  FLAT,
  accountEquity,
  applyFill,
  cashDelta,
  commissionFor,
  marketValue,
  sizeByRisk,
  slippedPrice,
  unrealizedPnl,
  type Position,
} from "./portfolio";

describe("applyFill — opening and adding", () => {
  it("opens a long from flat at the fill price", () => {
    const p = applyFill(FLAT, { quantity: 100, price: 10 });
    expect(p).toEqual({ quantity: 100, avgCost: 10, realizedPnl: 0 });
  });

  it("opens a short from flat", () => {
    const p = applyFill(FLAT, { quantity: -100, price: 10 });
    expect(p).toEqual({ quantity: -100, avgCost: 10, realizedPnl: 0 });
  });

  it("re-averages when adding to a long and realises nothing", () => {
    let p = applyFill(FLAT, { quantity: 100, price: 10 });
    p = applyFill(p, { quantity: 100, price: 20 });
    expect(p.quantity).toBe(200);
    expect(p.avgCost).toBeCloseTo(15, 9);
    expect(p.realizedPnl).toBe(0);
  });

  it("re-averages when adding to a short", () => {
    let p = applyFill(FLAT, { quantity: -100, price: 20 });
    p = applyFill(p, { quantity: -100, price: 10 });
    expect(p.quantity).toBe(-200);
    expect(p.avgCost).toBeCloseTo(15, 9);
    expect(p.realizedPnl).toBe(0);
  });

  it("does not mutate the input position", () => {
    const original: Position = { quantity: 100, avgCost: 10, realizedPnl: 0 };
    const copy = { ...original };
    applyFill(original, { quantity: 50, price: 12 });
    expect(original).toEqual(copy);
  });
});

describe("applyFill — reducing and closing", () => {
  it("realises profit on a partial close and keeps the original cost basis", () => {
    let p = applyFill(FLAT, { quantity: 100, price: 10 });
    p = applyFill(p, { quantity: -40, price: 15 });
    expect(p.quantity).toBe(60);
    expect(p.avgCost).toBe(10); // unchanged by a reduction
    expect(p.realizedPnl).toBeCloseTo(40 * 5, 9);
  });

  it("realises a loss when closing a long below cost", () => {
    let p = applyFill(FLAT, { quantity: 100, price: 10 });
    p = applyFill(p, { quantity: -100, price: 8 });
    expect(p.quantity).toBe(0);
    expect(p.avgCost).toBe(0);
    expect(p.realizedPnl).toBeCloseTo(-200, 9);
  });

  it("realises profit on a short when the price falls", () => {
    let p = applyFill(FLAT, { quantity: -100, price: 10 });
    p = applyFill(p, { quantity: 100, price: 6 });
    expect(p.quantity).toBe(0);
    expect(p.realizedPnl).toBeCloseTo(400, 9);
  });

  it("realises a loss on a short when the price rises", () => {
    let p = applyFill(FLAT, { quantity: -100, price: 10 });
    p = applyFill(p, { quantity: 100, price: 14 });
    expect(p.realizedPnl).toBeCloseTo(-400, 9);
  });

  it("zeroes avgCost when flat so it can't be misread as a live basis", () => {
    let p = applyFill(FLAT, { quantity: 50, price: 33 });
    p = applyFill(p, { quantity: -50, price: 33 });
    expect(p).toEqual({ quantity: 0, avgCost: 0, realizedPnl: 0 });
  });
});

describe("applyFill — flipping through zero", () => {
  it("closes the long, then opens the short remainder at the fill price", () => {
    let p = applyFill(FLAT, { quantity: 100, price: 10 });
    p = applyFill(p, { quantity: -150, price: 12 });
    // Closed 100 at 12 for +200, then opened 50 short at 12.
    expect(p.quantity).toBe(-50);
    expect(p.avgCost).toBe(12);
    expect(p.realizedPnl).toBeCloseTo(200, 9);
  });

  it("flips from short to long symmetrically", () => {
    let p = applyFill(FLAT, { quantity: -80, price: 20 });
    p = applyFill(p, { quantity: 200, price: 15 });
    // Covered 80 at 15 for +400, then opened 120 long at 15.
    expect(p.quantity).toBe(120);
    expect(p.avgCost).toBe(15);
    expect(p.realizedPnl).toBeCloseTo(400, 9);
  });
});

describe("applyFill — commission", () => {
  it("subtracts commission even when nothing is realised", () => {
    const p = applyFill(FLAT, { quantity: 100, price: 10, commission: 7 });
    expect(p.realizedPnl).toBeCloseTo(-7, 9);
    expect(p.avgCost).toBe(10);
  });

  it("subtracts commission from realised profit on a close", () => {
    let p = applyFill(FLAT, { quantity: 100, price: 10, commission: 5 });
    p = applyFill(p, { quantity: -100, price: 12, commission: 5 });
    expect(p.realizedPnl).toBeCloseTo(200 - 10, 9);
  });

  it("charges commission on a zero-quantity fill without touching the position", () => {
    const start: Position = { quantity: 10, avgCost: 5, realizedPnl: 0 };
    const p = applyFill(start, { quantity: 0, price: 99, commission: 2 });
    expect(p.quantity).toBe(10);
    expect(p.avgCost).toBe(5);
    expect(p.realizedPnl).toBeCloseTo(-2, 9);
  });
});

describe("round-trip invariant", () => {
  it("realised P&L over a full round trip equals gross move minus costs", () => {
    // 100 @ 50 -> add 100 @ 60 (avg 55) -> close all @ 65.
    let p = applyFill(FLAT, { quantity: 100, price: 50, commission: 5 });
    p = applyFill(p, { quantity: 100, price: 60, commission: 6 });
    p = applyFill(p, { quantity: -200, price: 65, commission: 13 });
    expect(p.quantity).toBe(0);
    expect(p.realizedPnl).toBeCloseTo(200 * (65 - 55) - (5 + 6 + 13), 9);
  });
});

describe("valuation helpers", () => {
  it("marks unrealised P&L for longs and shorts", () => {
    expect(unrealizedPnl({ quantity: 100, avgCost: 10, realizedPnl: 0 }, 12)).toBeCloseTo(200, 9);
    expect(unrealizedPnl({ quantity: -100, avgCost: 10, realizedPnl: 0 }, 12)).toBeCloseTo(-200, 9);
    expect(unrealizedPnl(FLAT, 12)).toBe(0);
  });

  it("treats a short as negative market value", () => {
    expect(marketValue({ quantity: -10, avgCost: 5, realizedPnl: 0 }, 7)).toBe(-70);
  });

  it("sums cash and positions into equity", () => {
    const equity = accountEquity(1000, [
      { position: { quantity: 10, avgCost: 5, realizedPnl: 0 }, price: 8 },
      { position: { quantity: -5, avgCost: 20, realizedPnl: 0 }, price: 18 },
    ]);
    expect(equity).toBeCloseTo(1000 + 80 - 90, 9);
  });
});

describe("cost model", () => {
  it("buying reduces cash, selling raises it", () => {
    expect(cashDelta({ quantity: 100, price: 10 })).toBe(-1000);
    expect(cashDelta({ quantity: -100, price: 10 })).toBe(1000);
  });

  it("commission is always a cost regardless of side", () => {
    expect(cashDelta({ quantity: 100, price: 10, commission: 5 })).toBe(-1005);
    expect(cashDelta({ quantity: -100, price: 10, commission: 5 })).toBe(995);
  });

  it("computes commission from notional in basis points", () => {
    expect(commissionFor(100, 100, 10)).toBeCloseTo(10, 9);
    expect(commissionFor(-100, 100, 10)).toBeCloseTo(10, 9); // side-independent
  });

  it("slips buys up and sells down", () => {
    expect(slippedPrice(100, "BUY", 50)).toBeCloseTo(100.5, 9);
    expect(slippedPrice(100, "SELL", 50)).toBeCloseTo(99.5, 9);
    expect(slippedPrice(100, "BUY", 0)).toBe(100);
  });
});

describe("sizeByRisk", () => {
  it("sizes so the stop loses exactly the risked fraction", () => {
    // Risk 1% of 100k = 1000, stop 2 away → 500 units.
    expect(sizeByRisk(100_000, 1, 2)).toBeCloseTo(500, 9);
  });

  it("returns zero rather than guessing when there is no usable stop", () => {
    expect(sizeByRisk(100_000, 1, 0)).toBe(0);
    expect(sizeByRisk(100_000, 1, -5)).toBe(0);
    expect(sizeByRisk(0, 1, 2)).toBe(0);
    expect(sizeByRisk(100_000, 0, 2)).toBe(0);
  });
});
