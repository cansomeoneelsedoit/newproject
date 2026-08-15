import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPct, formatSigned } from "@/lib/format";

/** BUY / SELL / FLAT, coloured by direction. */
export function SideBadge({ side }: { side: string }) {
  if (side === "BUY") {
    return <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">Long</Badge>;
  }
  if (side === "SELL") {
    return <Badge className="border-transparent bg-red-600 text-white hover:bg-red-600/90">Short</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Flat
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "FILLED":
      return <Badge className="border-transparent bg-emerald-600 text-white">Filled</Badge>;
    case "PENDING":
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Resting</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">Cancelled</Badge>;
  }
}

/**
 * A signed number that is green when positive and red when negative.
 * Zero stays neutral — colouring a scratch trade green overstates it.
 */
export function Pnl({
  value,
  pct = false,
  className,
}: {
  value: number;
  pct?: boolean;
  className?: string;
}) {
  const tone =
    value > 0 ? "text-emerald-600" : value < 0 ? "text-red-600" : "text-muted-foreground";
  return (
    <span className={cn("tabular-nums", tone, className)}>
      {pct ? formatPct(value) : formatSigned(value)}
    </span>
  );
}

const ASSET_LABELS: Record<string, string> = {
  EQUITY: "Equity",
  CRYPTO: "Crypto",
  FX: "FX",
  COMMODITY: "Commodity",
  INDEX: "Index",
};

export function assetClassLabel(assetClass: string): string {
  return ASSET_LABELS[assetClass] ?? assetClass;
}

const STRATEGY_LABELS: Record<string, string> = {
  SMA_CROSSOVER: "SMA crossover",
  RSI_REVERSION: "RSI reversion",
  DONCHIAN_BREAKOUT: "Donchian breakout",
  MACD_TREND: "MACD trend",
};

export function strategyLabel(kind: string): string {
  return STRATEGY_LABELS[kind] ?? kind;
}

/**
 * Marks where an analysis came from. Rule-based output must never be mistaken
 * for model output, and vice versa.
 */
export function EngineBadge({ model }: { model: string }) {
  if (model === "rule-based") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Rule-based
      </Badge>
    );
  }
  return <Badge variant="accent">{model}</Badge>;
}
