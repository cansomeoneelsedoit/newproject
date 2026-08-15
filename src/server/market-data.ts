/**
 * Market data providers.
 *
 * Kronos reads prices through this seam rather than calling a vendor directly,
 * so swapping in a real feed is a config change rather than a rewrite.
 *
 * Two providers ship:
 * - `synthetic` (default): deterministic local generation. No network, no key,
 *   reproducible. Correct choice for demos, tests and CI.
 * - `stooq`: a real, key-free daily CSV endpoint. Used only when
 *   MARKET_DATA_PROVIDER=stooq, and it fails soft — a network error returns an
 *   empty bar list rather than throwing, so a data outage degrades the signals
 *   page instead of taking the app down.
 *
 * IMPORTANT: synthetic prices are not real market data. Anything computed from
 * them — signals, backtests, P&L — is a simulation of the machinery, not a
 * claim about a real instrument. The UI labels this wherever numbers are shown.
 */

import { generateCandles, type SyntheticSpec } from "@/lib/synthetic";
import type { Candle } from "@/lib/indicators";

export type ProviderName = "synthetic" | "stooq";

export type FetchArgs = {
  symbol: string;
  /** How many daily bars to return, most recent last. */
  bars: number;
  endDate?: Date;
};

export type ProviderResult = {
  candles: Candle[];
  provider: ProviderName;
  /** True when the data is generated rather than observed. */
  synthetic: boolean;
  note?: string;
};

/** Per-symbol character for the synthetic generator. */
const SYNTHETIC_PROFILES: Record<string, Pick<SyntheticSpec, "startPrice" | "drift" | "volatility">> = {
  AAPL: { startPrice: 120, drift: 0.14, volatility: 0.26 },
  MSFT: { startPrice: 250, drift: 0.16, volatility: 0.24 },
  NVDA: { startPrice: 90, drift: 0.35, volatility: 0.55 },
  AMZN: { startPrice: 130, drift: 0.12, volatility: 0.32 },
  SPY: { startPrice: 400, drift: 0.09, volatility: 0.15 },
  BTCUSD: { startPrice: 28_000, drift: 0.4, volatility: 0.7 },
  ETHUSD: { startPrice: 1_700, drift: 0.3, volatility: 0.8 },
  EURUSD: { startPrice: 1.08, drift: 0.0, volatility: 0.08 },
  GOLD: { startPrice: 1_900, drift: 0.06, volatility: 0.14 },
};

const DEFAULT_PROFILE = { startPrice: 100, drift: 0.08, volatility: 0.3 };

export function activeProvider(): ProviderName {
  return process.env.MARKET_DATA_PROVIDER === "stooq" ? "stooq" : "synthetic";
}

function syntheticFetch({ symbol, bars, endDate }: FetchArgs): ProviderResult {
  const profile = SYNTHETIC_PROFILES[symbol.toUpperCase()] ?? DEFAULT_PROFILE;
  const candles = generateCandles({
    symbol: symbol.toUpperCase(),
    bars,
    endDate: endDate ?? new Date(),
    ...profile,
  });
  return {
    candles,
    provider: "synthetic",
    synthetic: true,
    note: "Generated locally — not real market data.",
  };
}

/**
 * Stooq daily CSV. No API key, but no guarantees either: unknown symbols return
 * a body with no rows, and the endpoint is rate-limited. Any failure degrades to
 * an empty result that callers handle.
 */
async function stooqFetch({ symbol, bars }: FetchArgs): Promise<ProviderResult> {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol.toLowerCase())}&i=d`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      return { candles: [], provider: "stooq", synthetic: false, note: `Provider returned HTTP ${res.status}` };
    }
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1); // drop the header
    const candles: Candle[] = [];
    for (const row of rows) {
      const [date, open, high, low, close, volume] = row.split(",");
      const ts = new Date(`${date}T00:00:00Z`);
      const o = Number(open);
      const h = Number(high);
      const l = Number(low);
      const c = Number(close);
      // Stooq emits "N/D" for missing sessions; skip anything unparseable
      // rather than poisoning the series with NaN.
      if (Number.isNaN(ts.getTime()) || [o, h, l, c].some((n) => !Number.isFinite(n))) continue;
      candles.push({ ts, open: o, high: h, low: l, close: c, volume: Number(volume) || 0 });
    }
    if (candles.length === 0) {
      return { candles: [], provider: "stooq", synthetic: false, note: "No rows returned for that symbol" };
    }
    return { candles: candles.slice(-bars), provider: "stooq", synthetic: false };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { candles: [], provider: "stooq", synthetic: false, note: `Fetch failed: ${reason}` };
  }
}

/** Fetch bars from whichever provider is configured. */
export async function fetchCandles(args: FetchArgs): Promise<ProviderResult> {
  return activeProvider() === "stooq" ? stooqFetch(args) : syntheticFetch(args);
}
