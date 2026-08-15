/**
 * Display formatting.
 *
 * Kept separate from the quant core so the maths modules stay free of
 * presentation concerns and can be unit-tested on plain numbers.
 */

/** Round to `dp` decimal places, avoiding float representation noise. */
export function round(value: number, dp = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Money, in the instrument's own currency. Prices below $1 get more decimals —
 * showing an FX pair at "1.08" loses the pip that matters.
 */
export function formatMoney(value: number, currency = "USD"): string {
  const abs = Math.abs(value);
  const digits = abs !== 0 && abs < 1 ? 4 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    // Unknown currency code — fall back to a plain number rather than throwing
    // in the middle of a render.
    return `${round(value, digits).toFixed(digits)} ${currency}`;
  }
}

/** A percentage with an explicit sign, e.g. `+12.4%`. */
export function formatPct(value: number, dp = 2): string {
  const r = round(value, dp);
  return `${r > 0 ? "+" : ""}${r.toFixed(dp)}%`;
}

/** A signed number for P&L columns. */
export function formatSigned(value: number, dp = 2): string {
  const r = round(value, dp);
  return `${r > 0 ? "+" : ""}${r.toFixed(dp)}`;
}

/** Compact quantity display — share counts are rarely meaningful past 4dp. */
export function formatQty(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return round(value, 0).toLocaleString("en-US");
  if (abs >= 1) return String(round(value, 2));
  return String(round(value, 4));
}

/** `2026-08-15` in UTC, stable regardless of the server's timezone. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
