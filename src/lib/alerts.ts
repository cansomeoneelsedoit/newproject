/**
 * TradingView alert parsing and sizing.
 *
 * Pure, so it unit-tests without a database. The webhook route does I/O; every
 * decision about *what the alert means* is made here.
 *
 * The payload is whatever TradingView posts. Kronos generates it (see
 * `src/lib/pine.ts`), but a user can hand-edit an alert message or point an
 * older script at the endpoint, so nothing about the shape is assumed.
 */

export type AlertAction = "BUY" | "SELL" | "FLAT";

export type ParsedAlert = {
  secret: string;
  symbol: string;
  action: AlertAction;
  /** Price reported by TradingView. Informational — fills use Kronos's own last close. */
  price: number | null;
  strategyName: string | null;
};

export type ParseFailure = { ok: false; error: string };
export type ParseSuccess = { ok: true; alert: ParsedAlert };

const ACTIONS: Record<string, AlertAction> = {
  buy: "BUY",
  long: "BUY",
  enterlong: "BUY",
  sell: "SELL",
  short: "SELL",
  entershort: "SELL",
  flat: "FLAT",
  close: "FLAT",
  exit: "FLAT",
  closeall: "FLAT",
};

function str(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

/**
 * Parse a raw webhook body.
 *
 * Accepts an already-decoded object or the raw text; TradingView posts the
 * alert message verbatim, and a stray whitespace or a wrapping quote is a
 * user-config mistake rather than an attack, so both are tolerated.
 */
export function parseAlert(body: unknown): ParseSuccess | ParseFailure {
  let obj: unknown = body;

  if (typeof obj === "string") {
    const text = obj.trim();
    if (!text) return { ok: false, error: "Empty body" };
    try {
      obj = JSON.parse(text);
    } catch {
      return { ok: false, error: "Body is not JSON — leave the TradingView alert message box empty so the script supplies it" };
    }
  }

  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return { ok: false, error: "Body is not a JSON object" };
  }
  const o = obj as Record<string, unknown>;

  const secret = str(o, "secret", "key", "passphrase");
  if (!secret) return { ok: false, error: "No secret in payload" };

  const symbol = str(o, "symbol", "ticker").toUpperCase();
  if (!symbol) return { ok: false, error: "No symbol in payload" };

  const rawAction = str(o, "action", "side", "order_action").toLowerCase().replace(/[\s_-]/g, "");
  const action = ACTIONS[rawAction];
  if (!action) {
    return { ok: false, error: `Unrecognised action ${JSON.stringify(str(o, "action", "side", "order_action"))}` };
  }

  const rawPrice = str(o, "price", "close");
  const priceNum = rawPrice === "" ? NaN : Number(rawPrice);
  const price = Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null;

  const strategyName = str(o, "strategy", "strategy_name") || null;

  return { ok: true, alert: { secret, symbol, action, price, strategyName } };
}

/**
 * Constant-time string comparison.
 *
 * The secret is low-value (it authorises paper trades, not withdrawals) but
 * timing-safe comparison costs nothing and avoids teaching the wrong habit.
 */
export function secretMatches(expected: string, given: string): boolean {
  if (!expected) return false;
  // Walk the longer of the two so the loop count does not leak the length; a
  // length mismatch is folded into `diff` rather than short-circuiting.
  const n = Math.max(expected.length, given.length);
  let diff = expected.length ^ given.length;
  for (let i = 0; i < n; i++) {
    diff |= (expected.charCodeAt(i) || 0) ^ (given.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Signed position the alert is asking for.
 *
 * An alert names a *state*, not a trade — "long", "short", "flat" — which is
 * the same contract the strategies use internally. Sizing a fixed notional and
 * converting to a target means a repeated "buy" alert (TradingView can resend
 * on the same bar) does not pyramid a second position on top of the first.
 */
export function targetPosition(action: AlertAction, notional: number, price: number): number {
  if (action === "FLAT") return 0;
  if (!(price > 0) || !(notional > 0)) return 0;
  const qty = notional / price;
  return action === "BUY" ? qty : -qty;
}

/**
 * The order that moves `current` to `target`, or null when already there.
 * `minQty` swallows floating-point dust so an alert that changes nothing does
 * not generate a 0.0000001-share trade.
 */
export function deltaOrder(
  current: number,
  target: number,
  minQty = 1e-6,
): { side: "BUY" | "SELL"; quantity: number } | null {
  const delta = target - current;
  if (Math.abs(delta) < minQty) return null;
  return { side: delta > 0 ? "BUY" : "SELL", quantity: Math.abs(delta) };
}
