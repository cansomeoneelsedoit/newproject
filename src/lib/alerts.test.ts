import { describe, expect, it } from "vitest";

import { deltaOrder, parseAlert, secretMatches, targetPosition } from "./alerts";
import { toPineScript } from "./pine";

function ok(body: unknown) {
  const r = parseAlert(body);
  if (!r.ok) throw new Error(`expected parse to succeed: ${r.error}`);
  return r.alert;
}

describe("parseAlert", () => {
  it("reads the payload Kronos's own Pine script emits", () => {
    // The exact shape produced by kronosPayload() in src/lib/pine.ts.
    const alert = ok(
      '{"secret":"s3cr3t","symbol":"BTCUSDT","action":"buy","price":"64250.5","strategy":"Trend 20/50","time":"1724688000000"}',
    );
    expect(alert).toEqual({
      secret: "s3cr3t",
      symbol: "BTCUSDT",
      action: "BUY",
      price: 64250.5,
      strategyName: "Trend 20/50",
    });
  });

  it("stays in step with the Pine generator's field names", () => {
    // If someone renames a JSON key in pine.ts, this fails rather than the
    // integration silently going quiet in production.
    const script = toPineScript({
      strategyName: "X",
      kind: "SMA_CROSSOVER",
      params: {},
      webhookUrl: "http://h/x",
      secret: "abc",
    });
    for (const key of ["secret", "symbol", "action", "price", "strategy"]) {
      expect(script).toContain(`"${key}":`);
    }
  });

  it("accepts an already-decoded object as well as raw text", () => {
    expect(ok({ secret: "a", symbol: "aapl", action: "SELL" }).symbol).toBe("AAPL");
    expect(ok('  {"secret":"a","symbol":"aapl","action":"SELL"}  ').action).toBe("SELL");
  });

  it("normalises the action vocabulary TradingView users actually write", () => {
    const cases: [string, string][] = [
      ["buy", "BUY"], ["Long", "BUY"], ["enter_long", "BUY"],
      ["sell", "SELL"], ["SHORT", "SELL"], ["Enter Short", "SELL"],
      ["flat", "FLAT"], ["close", "FLAT"], ["exit", "FLAT"], ["close-all", "FLAT"],
    ];
    for (const [given, expected] of cases) {
      expect(ok({ secret: "a", symbol: "X", action: given }).action, given).toBe(expected);
    }
  });

  it("accepts the common alternative key names", () => {
    const alert = ok({ passphrase: "a", ticker: "ETHUSD", side: "long", close: 3000 });
    expect(alert.secret).toBe("a");
    expect(alert.symbol).toBe("ETHUSD");
    expect(alert.action).toBe("BUY");
    expect(alert.price).toBe(3000);
  });

  it("treats a missing or nonsensical price as absent rather than zero", () => {
    expect(ok({ secret: "a", symbol: "X", action: "buy" }).price).toBeNull();
    expect(ok({ secret: "a", symbol: "X", action: "buy", price: "n/a" }).price).toBeNull();
    expect(ok({ secret: "a", symbol: "X", action: "buy", price: 0 }).price).toBeNull();
    expect(ok({ secret: "a", symbol: "X", action: "buy", price: -5 }).price).toBeNull();
  });

  it("rejects anything it cannot act on, with a reason a user can fix", () => {
    const bad: [unknown, RegExp][] = [
      ["", /Empty body/],
      ["order buy @ market", /not JSON/],
      ["[1,2]", /not a JSON object/],
      [null, /not a JSON object/],
      [{ symbol: "X", action: "buy" }, /No secret/],
      [{ secret: "a", action: "buy" }, /No symbol/],
      [{ secret: "a", symbol: "X" }, /Unrecognised action/],
      [{ secret: "a", symbol: "X", action: "hodl" }, /Unrecognised action/],
    ];
    for (const [body, pattern] of bad) {
      const r = parseAlert(body);
      expect(r.ok, JSON.stringify(body)).toBe(false);
      if (!r.ok) expect(r.error).toMatch(pattern);
    }
  });
});

describe("secretMatches", () => {
  it("matches only an exact secret", () => {
    expect(secretMatches("hunter2", "hunter2")).toBe(true);
    expect(secretMatches("hunter2", "hunter3")).toBe(false);
    expect(secretMatches("hunter2", "hunter")).toBe(false);
    expect(secretMatches("hunter2", "hunter22")).toBe(false);
    expect(secretMatches("hunter2", "")).toBe(false);
  });

  it("refuses to authenticate against an unset secret", () => {
    expect(secretMatches("", "")).toBe(false);
    expect(secretMatches("", "anything")).toBe(false);
  });
});

describe("targetPosition", () => {
  it("sizes a fixed notional into quantity", () => {
    expect(targetPosition("BUY", 1000, 50)).toBe(20);
    expect(targetPosition("SELL", 1000, 50)).toBe(-20);
    expect(targetPosition("FLAT", 1000, 50)).toBe(0);
  });

  it("returns flat rather than Infinity on a bad price or notional", () => {
    expect(targetPosition("BUY", 1000, 0)).toBe(0);
    expect(targetPosition("BUY", 1000, -1)).toBe(0);
    expect(targetPosition("BUY", 0, 50)).toBe(0);
  });
});

describe("deltaOrder", () => {
  it("opens, reverses and closes to reach the target", () => {
    expect(deltaOrder(0, 20)).toEqual({ side: "BUY", quantity: 20 });
    expect(deltaOrder(20, 0)).toEqual({ side: "SELL", quantity: 20 });
    // A flip through zero is one order for the whole distance.
    expect(deltaOrder(20, -20)).toEqual({ side: "SELL", quantity: 40 });
    expect(deltaOrder(-20, 20)).toEqual({ side: "BUY", quantity: 40 });
  });

  it("does not pyramid when the same signal arrives twice", () => {
    expect(deltaOrder(20, 20)).toBeNull();
    expect(deltaOrder(0, 0)).toBeNull();
  });

  it("ignores floating-point dust", () => {
    expect(deltaOrder(20, 20 + 1e-12)).toBeNull();
    expect(deltaOrder(20, 20.5)).toEqual({ side: "BUY", quantity: 0.5 });
  });
});
