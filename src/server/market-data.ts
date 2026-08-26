/**
 * Market data providers.
 *
 * Kronos reads prices through this seam rather than calling a vendor directly,
 * so swapping in a real feed is a config change rather than a rewrite.
 *
 * Three providers ship, chosen with MARKET_DATA_PROVIDER:
 * - `synthetic` (default): deterministic local generation. No network, no key,
 *   reproducible. Correct choice for demos, tests and CI.
 * - `stooq`: real key-free daily CSV. Equities and indices.
 * - `binance`: real key-free daily klines. Crypto, with a geo-block fallback.
 *
 * Both live providers fail soft — a network error returns an empty bar list
 * rather than throwing, so a data outage degrades the signals page instead of
 * taking the app down.
 *
 * IMPORTANT: synthetic prices are not real market data. Anything computed from
 * them — signals, backtests, P&L — is a simulation of the machinery, not a
 * claim about a real instrument. The UI labels this wherever numbers are shown.
 */

import { generateCandles, type SyntheticSpec } from "@/lib/synthetic";
import type { Candle } from "@/lib/indicators";

export type ProviderName = "synthetic" | "stooq" | "binance";

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
  const p = process.env.MARKET_DATA_PROVIDER;
  if (p === "stooq" || p === "binance") return p;
  return "synthetic";
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

/**
 * Binance public klines. No API key, no account. Crypto only.
 *
 * Two details that matter:
 * - The main host is geo-blocked in some regions (notably the US), so on a
 *   403/451 we retry against data-api.binance.vision, which serves the same
 *   public market data without the restriction.
 * - `limit` caps at 1000 bars per request, so longer histories are paged
 *   backwards using `endTime` until the requested count is met or the listing
 *   runs out.
 */
async function binanceFetch({ symbol, bars, endDate }: FetchArgs): Promise<ProviderResult> {
  const HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const collected: Candle[] = [];
  let endTime = (endDate ?? new Date()).getTime();
  let note: string | undefined;

  try {
    while (collected.length < bars) {
      const want = Math.min(1000, bars - collected.length);
      let rows: unknown[] | null = null;
      let lastStatus = 0;

      for (const host of HOSTS) {
        const url = `${host}/api/v3/klines?symbol=${sym}&interval=1d&limit=${want}&endTime=${endTime}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        lastStatus = res.status;
        if (res.ok) {
          rows = (await res.json()) as unknown[];
          break;
        }
        // 403/451 is the geo-block; anything else is a real error worth surfacing.
        if (res.status !== 403 && res.status !== 451) break;
      }

      if (rows === null) {
        note = `Provider returned HTTP ${lastStatus}`;
        break;
      }
      if (rows.length === 0) break;

      const page: Candle[] = [];
      for (const raw of rows) {
        if (!Array.isArray(raw) || raw.length < 6) continue;
        const [openTime, o, h, l, c, v] = raw as [number, string, string, string, string, string];
        const ts = new Date(Number(openTime));
        const nums = [Number(o), Number(h), Number(l), Number(c)];
        // Skip anything unparseable rather than poisoning the series with NaN.
        if (Number.isNaN(ts.getTime()) || nums.some((n) => !Number.isFinite(n))) continue;
        page.push({ ts, open: nums[0], high: nums[1], low: nums[2], close: nums[3], volume: Number(v) || 0 });
      }
      if (page.length === 0) break;

      collected.unshift(...page);
      // Step back one millisecond before the oldest bar we just took.
      endTime = page[0].ts.getTime() - 1;
      if (page.length < want) break; // listing exhausted
    }
  } catch (e) {
    note = `Fetch failed: ${e instanceof Error ? e.message : "unknown error"}`;
  }

  if (collected.length === 0) {
    return { candles: [], provider: "binance", synthetic: false, note: note ?? "No data returned for that symbol" };
  }
  return { candles: collected.slice(-bars), provider: "binance", synthetic: false, note };
}

/** Fetch bars from whichever provider is configured. */
export async function fetchCandles(args: FetchArgs): Promise<ProviderResult> {
  switch (activeProvider()) {
    case "stooq":
      return stooqFetch(args);
    case "binance":
      return binanceFetch(args);
    default:
      return syntheticFetch(args);
  }
}
