/**
 * Kronos domain rules.
 *
 * Deliberately free of Prisma and React imports: everything here is a pure
 * function over plain values so it can be unit-tested directly and reused from
 * both server components and client components.
 *
 * The thresholds below follow common integrated-pest-management practice for
 * Apis mellifera. They are defaults, not gospel — a beekeeper working a
 * different climate or a treatment-free operation will want to tune them.
 */

export type Temperament = "CALM" | "NORMAL" | "DEFENSIVE" | "AGGRESSIVE";
export type BroodPattern = "SOLID" | "SPOTTY" | "NONE";
export type HiveStatus = "ACTIVE" | "QUEENLESS" | "SWARMED" | "DEAD" | "SOLD";

/** Days between routine inspections during the active season. */
export const INSPECTION_INTERVAL_DAYS = 14;

/** A queen is usually replaced in her third season. */
export const REQUEEN_AFTER_YEARS = 2;

/**
 * Mites per 100 bees (alcohol wash / sugar roll). Below `MONITOR` the colony is
 * fine; at or above `TREAT` the mite load is past the economic threshold and
 * costs the colony more than treating it does.
 */
export const VARROA_THRESHOLDS = { MONITOR: 1, TREAT: 3 } as const;

export type VarroaVerdict = "UNKNOWN" | "OK" | "MONITOR" | "TREAT";

/**
 * Classify a mite count. `null`/`undefined` means the colony has not been
 * washed — reported as UNKNOWN rather than assumed clean, because an
 * unmeasured colony is the one most likely to collapse.
 */
export function varroaVerdict(mitesPer100: number | null | undefined): VarroaVerdict {
  if (mitesPer100 === null || mitesPer100 === undefined || Number.isNaN(mitesPer100)) {
    return "UNKNOWN";
  }
  if (mitesPer100 >= VARROA_THRESHOLDS.TREAT) return "TREAT";
  if (mitesPer100 >= VARROA_THRESHOLDS.MONITOR) return "MONITOR";
  return "OK";
}

/** The observations a health score is computed from. */
export type HealthInput = {
  queenSeen: boolean;
  eggsSeen: boolean;
  broodPattern: BroodPattern;
  queenCells: number;
  framesOfBees: number;
  framesOfBrood: number;
  storesKg: number;
  varroaPer100?: number | null;
  temperament: Temperament;
};

export type HealthBand = "STRONG" | "FAIR" | "WEAK" | "CRITICAL";

export type HealthResult = {
  score: number;
  band: HealthBand;
  /** Human-readable reasons for every deduction, worst first. */
  flags: string[];
};

/**
 * Score a colony out of 100 from a single inspection.
 *
 * Deductions are additive and clamped at 0. The weighting puts queen status
 * first (a queenless colony dwindles to nothing regardless of how strong it
 * looks today), then mites, then population and stores.
 */
export function colonyHealth(input: HealthInput): HealthResult {
  const flags: { weight: number; message: string }[] = [];

  // Queen status. Eggs are the reliable signal — seeing the queen is a bonus,
  // and plenty of good colonies hide her. No eggs AND no queen is the alarm.
  if (!input.eggsSeen && !input.queenSeen) {
    flags.push({ weight: 35, message: "No queen and no eggs seen — possibly queenless" });
  } else if (!input.eggsSeen) {
    flags.push({ weight: 15, message: "No eggs seen — laying may have stopped" });
  }

  if (input.broodPattern === "NONE") {
    flags.push({ weight: 30, message: "No brood present" });
  } else if (input.broodPattern === "SPOTTY") {
    flags.push({ weight: 15, message: "Spotty brood pattern — failing queen or disease" });
  }

  if (input.queenCells > 0) {
    flags.push({
      weight: 10,
      message: `${input.queenCells} queen cell${input.queenCells === 1 ? "" : "s"} — swarm preparation`,
    });
  }

  const varroa = varroaVerdict(input.varroaPer100);
  if (varroa === "TREAT") {
    flags.push({ weight: 25, message: `Varroa at ${input.varroaPer100}/100 — past treatment threshold` });
  } else if (varroa === "MONITOR") {
    flags.push({ weight: 10, message: `Varroa at ${input.varroaPer100}/100 — monitor closely` });
  } else if (varroa === "UNKNOWN") {
    flags.push({ weight: 5, message: "No recent mite wash" });
  }

  if (input.framesOfBees < 3) {
    flags.push({ weight: 20, message: "Very low population" });
  } else if (input.framesOfBees < 6) {
    flags.push({ weight: 10, message: "Below-average population" });
  }

  if (input.storesKg < 5) {
    flags.push({ weight: 20, message: "Stores critically low — feed now" });
  } else if (input.storesKg < 10) {
    flags.push({ weight: 10, message: "Stores light" });
  }

  if (input.temperament === "AGGRESSIVE") {
    flags.push({ weight: 10, message: "Aggressive temperament — consider requeening" });
  } else if (input.temperament === "DEFENSIVE") {
    flags.push({ weight: 5, message: "Defensive temperament" });
  }

  const deductions = flags.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.max(0, Math.min(100, 100 - deductions));

  return {
    score,
    band: healthBand(score),
    flags: flags.sort((a, b) => b.weight - a.weight).map((f) => f.message),
  };
}

export function healthBand(score: number): HealthBand {
  if (score >= 80) return "STRONG";
  if (score >= 60) return "FAIR";
  if (score >= 35) return "WEAK";
  return "CRITICAL";
}

/**
 * Whole days elapsed between two instants, floored. Uses UTC day boundaries so
 * a daylight-saving shift can't produce an off-by-one.
 */
export function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export type InspectionDue = {
  /** Days since the last inspection, or null if never inspected. */
  daysSince: number | null;
  due: boolean;
  /** Days past the interval. 0 when not yet due. */
  overdueBy: number;
};

/**
 * Whether a colony is due a visit. Colonies that are dead, sold, or swarmed out
 * are never "due" — chasing them would just add noise to the dashboard.
 * A colony that has never been inspected is always due.
 */
export function inspectionDue(
  lastInspectedAt: Date | null | undefined,
  now: Date,
  status: HiveStatus = "ACTIVE",
  intervalDays: number = INSPECTION_INTERVAL_DAYS,
): InspectionDue {
  if (status === "DEAD" || status === "SOLD" || status === "SWARMED") {
    return { daysSince: lastInspectedAt ? daysBetween(lastInspectedAt, now) : null, due: false, overdueBy: 0 };
  }
  if (!lastInspectedAt) return { daysSince: null, due: true, overdueBy: 0 };

  const daysSince = daysBetween(lastInspectedAt, now);
  const overdueBy = Math.max(0, daysSince - intervalDays);
  return { daysSince, due: daysSince >= intervalDays, overdueBy };
}

/**
 * Age of the reigning queen in seasons, and whether she is due replacement.
 * `queenYear` is the year she was raised.
 */
export function queenAge(
  queenYear: number | null | undefined,
  now: Date,
): { years: number | null; shouldRequeen: boolean } {
  if (!queenYear) return { years: null, shouldRequeen: false };
  const years = now.getUTCFullYear() - queenYear;
  return { years, shouldRequeen: years >= REQUEEN_AFTER_YEARS };
}

/** Round to `dp` decimal places, avoiding float noise in summed weights. */
export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Format a weight for display, e.g. `12.4 kg`. */
export function formatKg(value: number, dp = 1): string {
  return `${round(value, dp).toFixed(dp)} kg`;
}
