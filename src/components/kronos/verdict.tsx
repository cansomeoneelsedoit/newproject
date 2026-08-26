import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The verdict is the most important thing on a backtest page, so it is loud.
 *
 * A rejected strategy showing a large green in-sample return is precisely how
 * people talk themselves into losing money; the banner exists so the number can
 * never be read without the judgement next to it.
 */
export function VerdictBanner({
  accepted,
  summary,
  failures,
}: {
  accepted: boolean;
  summary: string;
  failures: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        accepted
          ? "border-emerald-600/50 bg-emerald-600/5"
          : "border-red-600/50 bg-red-600/5",
      )}
    >
      <div className="flex items-start gap-3">
        {accepted ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className={cn("font-medium", accepted ? "text-emerald-700" : "text-red-700")}>
            {accepted ? "Accepted" : "Rejected"}
          </h2>
          <p className="text-sm text-muted-foreground">{summary}</p>

          {failures.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {failures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Compact pass/fail pill for list views. */
export function VerdictBadge({ accepted }: { accepted: boolean }) {
  return accepted ? (
    <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">
      Accepted
    </Badge>
  ) : (
    <Badge variant="destructive">Rejected</Badge>
  );
}

export function GateBadge({ passed, label }: { passed: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        passed ? "border-emerald-600 text-emerald-700" : "border-red-600 text-red-700",
      )}
    >
      {passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );
}
