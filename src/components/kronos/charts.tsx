import { cn } from "@/lib/utils";

/**
 * Inline SVG charts.
 *
 * Deliberately dependency-free and renderable on the server: these are read-only
 * visualisations inside RSC pages, so shipping a charting library to the client
 * for them would be a lot of JavaScript for no interaction. They use
 * `currentColor` and theme tokens so they work in light and dark without a
 * second palette.
 */

function pathFrom(values: number[], width: number, height: number, pad = 1): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);

  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      // SVG y grows downward, so invert.
      const y = pad + (height - pad * 2) * (1 - (v - min) / span);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/**
 * A small trend line. Colour follows direction: green when the series ends
 * above where it started, red when below.
 */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const rising = values[values.length - 1] >= values[0];
  const d = pathFrom(values, width, height);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn(rising ? "text-emerald-600" : "text-red-600", className)}
      role="img"
      aria-label={rising ? "Trending up" : "Trending down"}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export type CurvePoint = { ts: string; equity: number };

/**
 * Equity curve with an optional benchmark overlay, a zero-ish baseline at the
 * starting equity, and a filled area under the strategy line.
 */
export function EquityChart({
  curve,
  benchmark,
  height = 240,
  className,
}: {
  curve: CurvePoint[];
  benchmark?: CurvePoint[];
  height?: number;
  className?: string;
}) {
  if (curve.length < 2) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Not enough data points to draw a curve.
      </p>
    );
  }

  const width = 1000; // viewBox units; the SVG scales to its container
  const values = curve.map((p) => p.equity);
  const benchValues = benchmark?.map((p) => p.equity) ?? [];

  // Share one scale across both series so the comparison is honest.
  const all = [...values, ...benchValues];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 4;

  const toY = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / span);
  const stepX = (width - pad * 2) / (curve.length - 1);
  const toX = (i: number) => pad + i * stepX;

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(" ");
  const area = `${line} L${toX(values.length - 1).toFixed(2)},${height - pad} L${pad},${height - pad} Z`;

  const benchLine =
    benchmark && benchmark.length > 1
      ? benchmark
          .map((p, i) => {
            const x = pad + (i * (width - pad * 2)) / (benchmark.length - 1);
            return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${toY(p.equity).toFixed(2)}`;
          })
          .join(" ")
      : null;

  const startY = toY(values[0]);
  const rising = values[values.length - 1] >= values[0];

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-auto w-full"
        role="img"
        aria-label="Equity curve"
      >
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Starting equity — the line that separates profit from loss. */}
        <line
          x1={pad}
          y1={startY}
          x2={width - pad}
          y2={startY}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeDasharray="4 4"
          className="text-muted-foreground"
        />

        {benchLine ? (
          <path
            d={benchLine}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className="text-muted-foreground"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        <g className={rising ? "text-emerald-600" : "text-red-600"}>
          <path d={area} fill="url(#equityFill)" stroke="none" />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>

      {benchLine ? (
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-0.5 w-4", rising ? "bg-emerald-600" : "bg-red-600")} />
            Strategy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t border-dashed border-muted-foreground" />
            Buy &amp; hold
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Horizontal proportion bar, used for win-rate style figures. */
export function RatioBar({ pct, className }: { pct: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full", clamped >= 50 ? "bg-emerald-600" : "bg-amber-500")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
