import { describe, expect, it } from "vitest";

import { PINE_SUPPORTED, canExportPine, toPineScript, type PineOptions } from "./pine";
import { parseParams, type StrategyKind } from "./strategies";

function opts(over: Partial<PineOptions> = {}): PineOptions {
  return {
    strategyName: "Trend 20/50",
    kind: "SMA_CROSSOVER",
    params: { fast: 20, slow: 50, allowShort: false },
    webhookUrl: "http://localhost:3004/api/webhooks/tradingview/org_1",
    secret: "s3cr3t",
    ...over,
  };
}

/**
 * A crude balance check. Pine has no compiler available here, so the tests
 * assert the structural things that actually break a paste-into-TradingView:
 * the version pragma, one `strategy()` call, balanced quotes on every line,
 * and an alert_message on every order call.
 */
function linesWithOddQuotes(script: string): string[] {
  return script
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .filter((l) => (l.match(/'/g)?.length ?? 0) % 2 !== 0 || (l.match(/"/g)?.length ?? 0) % 2 !== 0);
}

describe("toPineScript", () => {
  it("emits a v5 script header for every supported kind", () => {
    for (const kind of PINE_SUPPORTED) {
      const script = toPineScript(opts({ kind, params: parseParams(kind as StrategyKind, {})! }));
      expect(script.startsWith("//@version=5")).toBe(true);
      expect(script.match(/^strategy\(/gm)?.length).toBe(1);
      expect(linesWithOddQuotes(script)).toEqual([]);
    }
  });

  it("routes every order through the webhook payload", () => {
    for (const kind of PINE_SUPPORTED) {
      const script = toPineScript(opts({ kind, params: parseParams(kind as StrategyKind, {})! }));
      const orders = script.match(/strategy\.(entry|close_all)\(/g) ?? [];
      expect(orders.length).toBeGreaterThan(0);
      // Every order call carries an alert_message; an order without one fires
      // on TradingView but never reaches Kronos.
      expect(script.match(/alert_message=kronosPayload\(/g)?.length).toBe(orders.length);
      expect(script).toContain("kronosPayload(action) =>");
    }
  });

  it("defines goLong / goShort / goFlat before the execution block", () => {
    for (const kind of PINE_SUPPORTED) {
      const script = toPineScript(opts({ kind, params: parseParams(kind as StrategyKind, {})! }));
      for (const v of ["goLong", "goShort", "goFlat", "allowShort"]) {
        const declared = script.indexOf(`${v} =`);
        const used = script.indexOf("// --- Execution");
        expect(declared, `${kind} declares ${v}`).toBeGreaterThan(-1);
        expect(declared).toBeLessThan(used);
      }
    }
  });

  it("interpolates the strategy's own parameters, not the defaults", () => {
    const sma = toPineScript(opts({ params: { fast: 7, slow: 33, allowShort: true } }));
    expect(sma).toContain('input.int(7, "Fast length"');
    expect(sma).toContain('input.int(33, "Slow length"');
    expect(sma).toContain('input.bool(true, "Allow shorts")');

    const rsiScript = toPineScript(
      opts({ kind: "RSI_REVERSION", params: { period: 9, oversold: 25, overbought: 75 } }),
    );
    expect(rsiScript).toContain('input.int(9, "RSI length"');
    expect(rsiScript).toContain('input.float(25, "Oversold")');
    expect(rsiScript).toContain('input.float(75, "Overbought")');
    expect(rsiScript).toContain('input.bool(false, "Allow shorts")');
  });

  it("falls back to Kronos defaults when a parameter is missing or the wrong type", () => {
    const script = toPineScript(opts({ params: { fast: "twenty", slow: null } }));
    expect(script).toContain('input.int(20, "Fast length"');
    expect(script).toContain('input.int(50, "Slow length"');
  });

  it("excludes the current bar from the Donchian channel, as Kronos does", () => {
    const script = toPineScript(
      opts({ kind: "DONCHIAN_BREAKOUT", params: { entryPeriod: 55, exitPeriod: 20 } }),
    );
    expect(script).toContain("entryHigh = ta.highest(high, entryLen)[1]");
    expect(script).toContain("exitLow = ta.lowest(low, exitLen)[1]");
    expect(script).not.toMatch(/ta\.highest\(high, entryLen\)(?!\[1\])/);
  });

  it("embeds the webhook URL and secret so the alert needs no manual message", () => {
    const script = toPineScript(opts({ webhookUrl: "https://x.test/hook/abc", secret: "shhh" }));
    expect(script).toContain("https://x.test/hook/abc");
    expect(script).toContain('{"secret":"shhh"');
    expect(script).toContain("alert message box EMPTY");
  });

  it("strips quotes and newlines that would otherwise break the script", () => {
    const script = toPineScript(
      opts({ strategyName: `Bob's "fast"\nmomentum`, secret: `a'b"c` }),
    );
    expect(linesWithOddQuotes(script)).toEqual([]);
    expect(script).toContain("Bob s  fast  momentum");
    expect(script).toContain('{"secret":"a b c"');
  });

  it("converts commission from basis points to the percent Pine wants", () => {
    expect(toPineScript(opts({ commissionBps: 25 }))).toContain("commission_value=0.25");
    expect(toPineScript(opts({ commissionBps: 0 }))).toContain("commission_value=0");
  });

  it("leaves Pine slippage at zero and says so, rather than inventing a tick count", () => {
    // Pine counts slippage in ticks (absolute); Kronos models it in basis points
    // (relative). There is no correct conversion without the symbol's mintick,
    // so the script must not pretend there is one.
    const script = toPineScript(opts({ slippageBps: 20 }));
    expect(script).toContain("slippage=0");
    expect(script).toContain("20 bps of slippage included");
    expect(script).toMatch(/read slightly better than reality/);
  });

  it("throws rather than emitting a broken script for an unknown kind", () => {
    expect(() => toPineScript(opts({ kind: "MARTINGALE" }))).toThrow(/No Pine template/);
  });
});

describe("canExportPine", () => {
  it("accepts every supported kind and rejects anything else", () => {
    for (const kind of PINE_SUPPORTED) expect(canExportPine(kind)).toBe(true);
    expect(canExportPine("MARTINGALE")).toBe(false);
    expect(canExportPine("")).toBe(false);
  });
});
