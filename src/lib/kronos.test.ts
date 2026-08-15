import { describe, expect, it } from "vitest";

import {
  INSPECTION_INTERVAL_DAYS,
  colonyHealth,
  daysBetween,
  formatKg,
  healthBand,
  inspectionDue,
  queenAge,
  round,
  varroaVerdict,
  type HealthInput,
} from "./kronos";

/** A textbook-healthy colony; individual tests override one field at a time. */
function healthy(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    queenSeen: true,
    eggsSeen: true,
    broodPattern: "SOLID",
    queenCells: 0,
    framesOfBees: 10,
    framesOfBrood: 6,
    storesKg: 20,
    varroaPer100: 0.5,
    temperament: "CALM",
    ...overrides,
  };
}

describe("varroaVerdict", () => {
  it("reports UNKNOWN when the colony has not been washed", () => {
    expect(varroaVerdict(null)).toBe("UNKNOWN");
    expect(varroaVerdict(undefined)).toBe("UNKNOWN");
    expect(varroaVerdict(Number.NaN)).toBe("UNKNOWN");
  });

  it("treats a clean wash as OK", () => {
    expect(varroaVerdict(0)).toBe("OK");
    expect(varroaVerdict(0.9)).toBe("OK");
  });

  it("flags the monitor band at and above 1 per 100", () => {
    expect(varroaVerdict(1)).toBe("MONITOR");
    expect(varroaVerdict(2.9)).toBe("MONITOR");
  });

  it("calls for treatment at and above the economic threshold", () => {
    expect(varroaVerdict(3)).toBe("TREAT");
    expect(varroaVerdict(12)).toBe("TREAT");
  });
});

describe("colonyHealth", () => {
  it("scores a textbook colony as STRONG with no flags", () => {
    const result = colonyHealth(healthy());
    expect(result.score).toBe(100);
    expect(result.band).toBe("STRONG");
    expect(result.flags).toEqual([]);
  });

  it("penalises a colony with neither queen nor eggs the hardest", () => {
    const result = colonyHealth(healthy({ queenSeen: false, eggsSeen: false }));
    expect(result.score).toBe(65);
    expect(result.flags[0]).toMatch(/possibly queenless/i);
  });

  it("is more forgiving when the queen is unseen but eggs are present", () => {
    // Plenty of strong colonies hide the queen; eggs prove she was laying
    // within the last three days, so this must not trigger the alarm.
    const result = colonyHealth(healthy({ queenSeen: false, eggsSeen: true }));
    expect(result.score).toBe(100);
    expect(result.flags).toEqual([]);
  });

  it("accumulates deductions across independent problems", () => {
    // spotty brood (15) + treat-level varroa (25) + low population (20)
    const result = colonyHealth(
      healthy({ broodPattern: "SPOTTY", varroaPer100: 5, framesOfBees: 2 }),
    );
    expect(result.score).toBe(40);
    expect(result.band).toBe("WEAK");
    expect(result.flags).toHaveLength(3);
  });

  it("sorts flags worst-first", () => {
    const result = colonyHealth(healthy({ temperament: "DEFENSIVE", broodPattern: "NONE" }));
    expect(result.flags[0]).toMatch(/no brood/i);
    expect(result.flags[1]).toMatch(/defensive/i);
  });

  it("clamps a catastrophic colony at zero rather than going negative", () => {
    const result = colonyHealth({
      queenSeen: false,
      eggsSeen: false,
      broodPattern: "NONE",
      queenCells: 3,
      framesOfBees: 1,
      framesOfBrood: 0,
      storesKg: 0,
      varroaPer100: 15,
      temperament: "AGGRESSIVE",
    });
    expect(result.score).toBe(0);
    expect(result.band).toBe("CRITICAL");
  });

  it("nudges the score down when no mite wash has been done", () => {
    const result = colonyHealth(healthy({ varroaPer100: null }));
    expect(result.score).toBe(95);
    expect(result.flags).toContain("No recent mite wash");
  });

  it("singularises the queen cell flag", () => {
    expect(colonyHealth(healthy({ queenCells: 1 })).flags[0]).toContain("1 queen cell —");
    expect(colonyHealth(healthy({ queenCells: 2 })).flags[0]).toContain("2 queen cells —");
  });
});

describe("healthBand", () => {
  it("maps scores onto bands at the documented boundaries", () => {
    expect(healthBand(100)).toBe("STRONG");
    expect(healthBand(80)).toBe("STRONG");
    expect(healthBand(79)).toBe("FAIR");
    expect(healthBand(60)).toBe("FAIR");
    expect(healthBand(59)).toBe("WEAK");
    expect(healthBand(35)).toBe("WEAK");
    expect(healthBand(34)).toBe("CRITICAL");
    expect(healthBand(0)).toBe("CRITICAL");
  });
});

describe("daysBetween", () => {
  it("floors partial days", () => {
    const from = new Date("2026-03-01T00:00:00Z");
    expect(daysBetween(from, new Date("2026-03-02T23:59:00Z"))).toBe(1);
    expect(daysBetween(from, new Date("2026-03-03T00:00:00Z"))).toBe(2);
  });

  it("survives a daylight-saving transition without an off-by-one", () => {
    // Europe/London springs forward on 2026-03-29.
    const from = new Date("2026-03-28T12:00:00Z");
    const to = new Date("2026-03-30T12:00:00Z");
    expect(daysBetween(from, to)).toBe(2);
  });
});

describe("inspectionDue", () => {
  const now = new Date("2026-08-15T09:00:00Z");

  it("treats a never-inspected colony as due", () => {
    expect(inspectionDue(null, now)).toEqual({ daysSince: null, due: true, overdueBy: 0 });
  });

  it("is not due inside the interval", () => {
    const last = new Date("2026-08-10T09:00:00Z"); // 5 days ago
    const result = inspectionDue(last, now);
    expect(result.due).toBe(false);
    expect(result.daysSince).toBe(5);
    expect(result.overdueBy).toBe(0);
  });

  it("becomes due exactly on the interval boundary", () => {
    const last = new Date(now.getTime() - INSPECTION_INTERVAL_DAYS * 86_400_000);
    const result = inspectionDue(last, now);
    expect(result.due).toBe(true);
    expect(result.overdueBy).toBe(0);
  });

  it("reports how far past the interval a colony has slipped", () => {
    const last = new Date("2026-07-15T09:00:00Z"); // 31 days ago
    const result = inspectionDue(last, now);
    expect(result.daysSince).toBe(31);
    expect(result.overdueBy).toBe(31 - INSPECTION_INTERVAL_DAYS);
  });

  it("never chases a dead, sold, or swarmed-out colony", () => {
    const long = new Date("2025-01-01T09:00:00Z");
    for (const status of ["DEAD", "SOLD", "SWARMED"] as const) {
      expect(inspectionDue(long, now, status).due).toBe(false);
    }
    expect(inspectionDue(long, now, "ACTIVE").due).toBe(true);
  });

  it("honours a custom interval", () => {
    const last = new Date("2026-08-08T09:00:00Z"); // 7 days ago
    expect(inspectionDue(last, now, "ACTIVE", 7).due).toBe(true);
    expect(inspectionDue(last, now, "ACTIVE", 21).due).toBe(false);
  });
});

describe("queenAge", () => {
  const now = new Date("2026-08-15T00:00:00Z");

  it("returns null for an unrecorded queen", () => {
    expect(queenAge(null, now)).toEqual({ years: null, shouldRequeen: false });
  });

  it("leaves a first- and second-season queen alone", () => {
    expect(queenAge(2026, now)).toEqual({ years: 0, shouldRequeen: false });
    expect(queenAge(2025, now)).toEqual({ years: 1, shouldRequeen: false });
  });

  it("recommends requeening in the third season", () => {
    expect(queenAge(2024, now)).toEqual({ years: 2, shouldRequeen: true });
    expect(queenAge(2021, now)).toEqual({ years: 5, shouldRequeen: true });
  });
});

describe("round / formatKg", () => {
  it("rounds without float noise", () => {
    expect(round(0.1 + 0.2)).toBe(0.3);
    expect(round(12.299999999999999, 1)).toBe(12.3);
    expect(round(2.345, 2)).toBe(2.35);
  });

  it("formats weights to one decimal place", () => {
    expect(formatKg(12.34)).toBe("12.3 kg");
    expect(formatKg(0)).toBe("0.0 kg");
    expect(formatKg(0.1 + 0.2)).toBe("0.3 kg");
  });
});
