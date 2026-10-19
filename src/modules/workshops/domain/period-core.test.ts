import { describe, expect, it } from "vitest";
import { err, ok } from "~/modules/_shared";
import {
  addMonths,
  effectivePeriodStatus,
  firstInstantOfNextCordobaMonth,
  parsePeriodKey,
  periodInRange,
  transitionPeriod,
} from "./period-core";

describe("period core", () => {
  it("parses strict period keys and rolls months over years", () => {
    for (const value of ["2026-1", "2026-00", "2026-13", "26-01", "2026/01"])
      expect(parsePeriodKey(value)).toEqual(err("invalid-format"));
    expect(parsePeriodKey("2026-01")).toEqual(ok("2026-01"));
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("uses the exact Córdoba first-next-month boundary", () => {
    expect(firstInstantOfNextCordobaMonth("2026-10").toISOString()).toBe(
      "2026-11-01T03:00:00.000Z",
    );
    expect(
      effectivePeriodStatus(
        "open",
        "2026-10",
        new Date("2026-11-01T01:30:00Z"),
      ),
    ).toBe("open");
    expect(
      effectivePeriodStatus(
        "open",
        "2026-10",
        new Date("2026-11-01T02:59:00Z"),
      ),
    ).toBe("open");
    expect(
      effectivePeriodStatus(
        "open",
        "2026-10",
        new Date("2026-11-01T03:00:00Z"),
      ),
    ).toBe("closed");
    expect(
      effectivePeriodStatus(
        "draft",
        "2026-10",
        new Date("2026-11-01T03:00:00Z"),
      ),
    ).toBe("closed");
    expect(
      effectivePeriodStatus(
        "draft",
        "2026-10",
        new Date("2026-11-01T02:59:00Z"),
      ),
    ).toBe("draft");
    expect(
      effectivePeriodStatus(
        "closed",
        "2026-10",
        new Date("2026-10-15T12:00:00Z"),
      ),
    ).toBe("closed");
  });

  it("enforces the inclusive current-to-twelve-month opening range", () => {
    expect(periodInRange("2026-10", "2026-10")).toBe(true);
    expect(periodInRange("2027-10", "2026-10")).toBe(true);
    expect(periodInRange("2027-11", "2026-10")).toBe(false);
    expect(periodInRange("2026-09", "2026-10")).toBe(false);
  });

  it("has a terminal closed lifecycle", () => {
    expect(transitionPeriod("draft", "open")).toEqual(ok("open"));
    expect(transitionPeriod("open", "closed")).toEqual(ok("closed"));
    expect(transitionPeriod("closed", "open")).toEqual(
      err({ kind: "transition-refused", from: "closed", to: "open" }),
    );
  });
});
