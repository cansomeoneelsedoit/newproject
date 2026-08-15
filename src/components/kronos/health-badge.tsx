import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HealthBand } from "@/lib/kronos";

const BAND_STYLES: Record<HealthBand, string> = {
  STRONG: "bg-emerald-600 text-white hover:bg-emerald-600/90",
  FAIR: "bg-amber-500 text-white hover:bg-amber-500/90",
  WEAK: "bg-orange-600 text-white hover:bg-orange-600/90",
  CRITICAL: "bg-red-600 text-white hover:bg-red-600/90",
};

const BAND_LABELS: Record<HealthBand, string> = {
  STRONG: "Strong",
  FAIR: "Fair",
  WEAK: "Weak",
  CRITICAL: "Critical",
};

/**
 * Colony health at a glance. `band === null` means the colony has never been
 * inspected — shown as a neutral outline rather than a scary red, because
 * "unknown" and "dying" are different problems.
 */
export function HealthBadge({
  band,
  score,
  className,
}: {
  band: HealthBand | null;
  score?: number;
  className?: string;
}) {
  if (!band) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        Not inspected
      </Badge>
    );
  }
  return (
    <Badge className={cn("border-transparent", BAND_STYLES[band], className)}>
      {BAND_LABELS[band]}
      {score !== undefined ? ` · ${score}` : ""}
    </Badge>
  );
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  QUEENLESS: "Queenless",
  SWARMED: "Swarmed",
  DEAD: "Dead",
  SOLD: "Sold",
};

export function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="accent">Active</Badge>;
  if (status === "QUEENLESS") return <Badge className="border-transparent bg-orange-600 text-white">Queenless</Badge>;
  if (status === "DEAD") return <Badge variant="destructive">Dead</Badge>;
  return <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>;
}

const HIVE_TYPE_LABELS: Record<string, string> = {
  LANGSTROTH: "Langstroth",
  NATIONAL: "National",
  WARRE: "Warré",
  TOP_BAR: "Top bar",
  NUC: "Nuc",
};

export function hiveTypeLabel(type: string): string {
  return HIVE_TYPE_LABELS[type] ?? type;
}
