import Anthropic from "@anthropic-ai/sdk";

import {
  atr,
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  type Candle,
} from "@/lib/indicators";
import { maxDrawdownPct, type EquityPoint } from "@/lib/metrics";
import { round } from "@/lib/format";

/**
 * Written analysis of an instrument.
 *
 * Two engines, and the app works with either:
 *
 * - **Claude** (`claude-opus-5`) when ANTHROPIC_API_KEY is set. The model is
 *   given a numeric snapshot and asked to interpret it; it is explicitly told
 *   the prices are simulated and that it must not give investment advice.
 * - **A deterministic rule-based writer** otherwise. This is not a stub — it
 *   reads the same snapshot and produces a genuine, if plainer, read of the
 *   setup. Kronos ships with no API key, so this is the default path and it has
 *   to be good enough to stand on its own.
 *
 * `AiAnalysis.model` records which engine produced a given row, so the UI can
 * always say where the words came from.
 */

export type IndicatorSnapshot = {
  symbol: string;
  name: string;
  provider: string;
  synthetic: boolean;
  lastClose: number;
  changePct1d: number | null;
  changePct20d: number | null;
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  rsi14: number | null;
  atr14: number | null;
  atrPctOfPrice: number | null;
  macdHistogram: number | null;
  bollingerPosition: number | null;
  above52wHighPct: number | null;
  drawdownFromPeakPct: number;
  signals: { strategy: string; side: string; reason: string }[];
};

export type AnalysisResult = {
  model: string;
  headline: string;
  content: string;
  context: IndicatorSnapshot;
};

/** The model id Kronos calls. Kept in one place so it is easy to audit. */
export const ANALYSIS_MODEL = "claude-opus-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ---------------------------------------------------------------------------
// Snapshot construction
// ---------------------------------------------------------------------------

function last<T>(series: (T | null)[]): T | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null) return series[i];
  }
  return null;
}

/**
 * Reduce a candle series to the handful of numbers an analyst would actually
 * look at. Everything downstream — Claude and the rule-based writer alike —
 * reads only this, so the two engines are always describing the same facts.
 */
export function buildSnapshot(
  meta: { symbol: string; name: string; provider: string; synthetic: boolean },
  candles: Candle[],
  signals: { strategy: string; side: string; reason: string }[] = [],
): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const lastClose = closes[closes.length - 1] ?? 0;

  const sma20 = last(sma(closes, 20));
  const sma50 = last(sma(closes, 50));
  const ema20 = last(ema(closes, 20));
  const rsi14 = last(rsi(closes, 14));
  const atr14 = last(atr(candles, 14));
  const hist = last(macd(closes).histogram);
  const bands = bollinger(closes, 20, 2);
  const upper = last(bands.upper);
  const lower = last(bands.lower);

  // Where price sits inside the Bollinger channel: 0 = lower band, 1 = upper.
  const bollingerPosition =
    upper !== null && lower !== null && upper !== lower
      ? round((lastClose - lower) / (upper - lower), 3)
      : null;

  const changePct1d =
    closes.length >= 2 && closes[closes.length - 2] !== 0
      ? round(((lastClose - closes[closes.length - 2]) / closes[closes.length - 2]) * 100, 2)
      : null;

  const changePct20d =
    closes.length >= 21 && closes[closes.length - 21] !== 0
      ? round(((lastClose - closes[closes.length - 21]) / closes[closes.length - 21]) * 100, 2)
      : null;

  // "52 week" over daily bars is ~252 sessions.
  const window = closes.slice(-252);
  const high = window.length > 0 ? Math.max(...window) : lastClose;
  const above52wHighPct = high !== 0 ? round(((lastClose - high) / high) * 100, 2) : null;

  const curve: EquityPoint[] = candles.map((c) => ({ ts: c.ts, equity: c.close }));

  return {
    ...meta,
    lastClose: round(lastClose, 4),
    changePct1d,
    changePct20d,
    sma20: sma20 === null ? null : round(sma20, 4),
    sma50: sma50 === null ? null : round(sma50, 4),
    ema20: ema20 === null ? null : round(ema20, 4),
    rsi14: rsi14 === null ? null : round(rsi14, 1),
    atr14: atr14 === null ? null : round(atr14, 4),
    atrPctOfPrice:
      atr14 === null || lastClose === 0 ? null : round((atr14 / lastClose) * 100, 2),
    macdHistogram: hist === null ? null : round(hist, 4),
    bollingerPosition,
    above52wHighPct,
    drawdownFromPeakPct: round(maxDrawdownPct(curve), 2),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Rule-based writer (the offline default)
// ---------------------------------------------------------------------------

function describeTrend(s: IndicatorSnapshot): string | null {
  if (s.sma20 === null || s.sma50 === null) return null;
  const spread = s.sma50 === 0 ? 0 : ((s.sma20 - s.sma50) / s.sma50) * 100;
  if (s.sma20 > s.sma50) {
    return `The 20-day average sits ${spread.toFixed(1)}% above the 50-day, so the medium-term trend is up.`;
  }
  return `The 20-day average sits ${Math.abs(spread).toFixed(1)}% below the 50-day, so the medium-term trend is down.`;
}

function describeMomentum(s: IndicatorSnapshot): string | null {
  if (s.rsi14 === null) return null;
  if (s.rsi14 >= 70) {
    return `RSI at ${s.rsi14} is in overbought territory — momentum is strong but stretched, and pullbacks from here are common.`;
  }
  if (s.rsi14 <= 30) {
    return `RSI at ${s.rsi14} is oversold. That is where mean-reversion setups look for a turn, and also where falling knives look cheap.`;
  }
  return `RSI at ${s.rsi14} is neutral — no momentum extreme to lean on either way.`;
}

function describeVolatility(s: IndicatorSnapshot): string | null {
  if (s.atrPctOfPrice === null) return null;
  if (s.atrPctOfPrice >= 4) {
    return `ATR is running at ${s.atrPctOfPrice}% of price, which is high — size positions smaller than usual and expect wide stops.`;
  }
  if (s.atrPctOfPrice <= 1) {
    return `ATR is only ${s.atrPctOfPrice}% of price. Quiet tape; breakouts from this kind of compression tend to travel.`;
  }
  return `ATR is ${s.atrPctOfPrice}% of price — ordinary volatility for this instrument.`;
}

function describePosition(s: IndicatorSnapshot): string | null {
  if (s.above52wHighPct === null) return null;
  if (s.above52wHighPct >= -1) {
    return `Price is at or within 1% of its 52-week high.`;
  }
  return `Price is ${Math.abs(s.above52wHighPct).toFixed(1)}% below its 52-week high, with a worst peak-to-trough drawdown of ${s.drawdownFromPeakPct}% over the loaded history.`;
}

/**
 * Write an analysis from the snapshot without calling any model.
 *
 * Deterministic: the same snapshot always yields the same words, which makes it
 * safe to seed and to screenshot.
 */
export function ruleBasedAnalysis(s: IndicatorSnapshot): AnalysisResult {
  const bullish: string[] = [];
  const bearish: string[] = [];

  if (s.sma20 !== null && s.sma50 !== null) {
    (s.sma20 > s.sma50 ? bullish : bearish).push("trend");
  }
  if (s.macdHistogram !== null) {
    (s.macdHistogram > 0 ? bullish : bearish).push("MACD");
  }
  if (s.rsi14 !== null) {
    if (s.rsi14 > 55) bullish.push("momentum");
    else if (s.rsi14 < 45) bearish.push("momentum");
  }
  const buySignals = s.signals.filter((x) => x.side === "BUY").length;
  const sellSignals = s.signals.filter((x) => x.side === "SELL").length;

  const net = bullish.length - bearish.length;
  const headline =
    net >= 2
      ? `${s.symbol}: trend and momentum both constructive`
      : net <= -2
        ? `${s.symbol}: trend and momentum both deteriorating`
        : `${s.symbol}: mixed picture, no clear edge`;

  const paragraphs = [
    [describeTrend(s), describeMomentum(s)].filter(Boolean).join(" "),
    [describeVolatility(s), describePosition(s)].filter(Boolean).join(" "),
    s.signals.length > 0
      ? `Across the configured strategies, ${buySignals} currently reads long and ${sellSignals} reads short${
          s.signals.length - buySignals - sellSignals > 0
            ? `, with the rest flat`
            : ""
        }. ${s.signals[0].reason}.`
      : "No strategies are currently evaluated against this instrument.",
    s.synthetic
      ? "These prices are generated locally, not observed. Treat everything above as an exercise of the analysis machinery rather than a claim about a real market."
      : "Prices are from the configured market-data provider. This is analysis, not investment advice.",
  ].filter((p) => p.length > 0);

  return {
    model: "rule-based",
    headline,
    content: paragraphs.join("\n\n"),
    context: s,
  };
}

// ---------------------------------------------------------------------------
// Claude writer
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a markets analyst writing a short technical read for an experienced trader inside Kronos, a trading-analysis tool.

You will be given a JSON snapshot of one instrument: latest price, moving averages, RSI, ATR, MACD histogram, Bollinger position, drawdown, and the current output of any configured strategies.

Write your read from those numbers. Ground every claim in a number that appears in the snapshot — do not invent prices, news, fundamentals, or events, and do not reference anything outside the snapshot.

Be direct and specific. Say what the setup looks like and what would invalidate it. If the indicators disagree, say so plainly rather than manufacturing a view.

Do not give investment advice, price targets, or buy/sell recommendations to the reader. Describe what the indicators show and what a trader would watch next.

If the snapshot says the data is synthetic, state clearly in your final sentence that the prices are generated and this is a demonstration of the analysis, not a claim about a real market.`;

const ANALYSIS_SCHEMA = {
  type: "object" as const,
  properties: {
    headline: {
      type: "string",
      description: "One line, under 80 characters, naming the setup.",
    },
    content: {
      type: "string",
      description:
        "Two to four short paragraphs of plain prose, separated by blank lines. No markdown headings or bullet lists.",
    },
  },
  required: ["headline", "content"],
  additionalProperties: false,
};

/**
 * Ask Claude for the analysis. Falls back to the rule-based writer on a missing
 * key, a refusal, a truncated response, or any transport error — a page that
 * renders a plainer analysis is a far better outcome than one that 500s because
 * an upstream API had a bad minute.
 */
export async function analyseInstrument(
  snapshot: IndicatorSnapshot,
): Promise<AnalysisResult> {
  if (!aiEnabled()) return ruleBasedAnalysis(snapshot);

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      // Thinking is on by default on this model and max_tokens caps thinking
      // plus response text together, hence the generous ceiling above.
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `Write the read for this instrument.\n\n${JSON.stringify(snapshot, null, 2)}`,
        },
      ],
    });

    // Check stop_reason before touching content: a refusal returns HTTP 200
    // with empty or partial content, and a truncated response is not a usable
    // analysis either.
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      return ruleBasedAnalysis(snapshot);
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const parsed = JSON.parse(text) as { headline?: string; content?: string };
    if (!parsed.headline || !parsed.content) return ruleBasedAnalysis(snapshot);

    return {
      model: response.model || ANALYSIS_MODEL,
      headline: parsed.headline,
      content: parsed.content,
      context: snapshot,
    };
  } catch {
    return ruleBasedAnalysis(snapshot);
  }
}
