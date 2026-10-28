import { describe, expect, it } from "vitest";
import {
  isPeriod,
  nextPeriod,
  percentOf,
  periodBounds,
  settlementCentavos,
} from "./insights-core";

describe("isPeriod", () => {
  it.each(["2026-11", "2026-01", "2030-12"])("accepts %s", (value) => {
    expect(isPeriod(value)).toBe(true);
  });

  it.each(["2026-13", "2026-00", "26-11", "2026-1", "", "2026-11-01"])(
    "rejects %j",
    (value) => {
      expect(isPeriod(value)).toBe(false);
    },
  );
});

describe("nextPeriod", () => {
  it("moves to the following month and rolls over the year", () => {
    expect(nextPeriod("2026-10")).toBe("2026-11");
    expect(nextPeriod("2026-12")).toBe("2027-01");
  });
});

describe("periodBounds", () => {
  it("spans the Cordoba calendar month as UTC instants", () => {
    const { from, to } = periodBounds("2026-11");
    expect(from.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });

  it("ends a December period on the first of January", () => {
    expect(periodBounds("2026-12").to.toISOString()).toBe(
      "2027-01-01T03:00:00.000Z",
    );
  });
});

describe("percentOf", () => {
  it("rounds to a whole percent", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(6, 6)).toBe(100);
  });

  it("is zero when there is nothing to divide by", () => {
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(3, 0)).toBe(0);
  });
});

describe("settlementCentavos", () => {
  it("applies the agreed basis points to the fee income", () => {
    expect(settlementCentavos(10_000_000, 2_500)).toBe(2_500_000);
    expect(settlementCentavos(0, 3_000)).toBe(0);
  });

  it("rounds half a centavo up, never down or to even", () => {
    expect(settlementCentavos(1, 5_000)).toBe(1);
    expect(settlementCentavos(3, 5_000)).toBe(2);
    expect(settlementCentavos(1, 4_999)).toBe(0);
  });

  it("keeps a whole fee at 100 % and nothing at 0 %", () => {
    expect(settlementCentavos(123_457, 10_000)).toBe(123_457);
    expect(settlementCentavos(123_457, 0)).toBe(0);
  });
});
