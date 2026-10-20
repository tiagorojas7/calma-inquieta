import { describe, expect, it } from "vitest";
import { cordobaMonthOf, periodAcceptsOrders } from "./period-window";

describe("cordobaMonthOf", () => {
  it("is still October at 02:59Z on 1 November", () => {
    expect(cordobaMonthOf(new Date("2026-11-01T02:59:00Z"))).toBe("2026-10");
  });

  it("turns November at 03:00Z", () => {
    expect(cordobaMonthOf(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11");
  });

  it("rolls the year at the new-year boundary", () => {
    expect(cordobaMonthOf(new Date("2027-01-01T02:59:00Z"))).toBe("2026-12");
    expect(cordobaMonthOf(new Date("2027-01-01T03:00:00Z"))).toBe("2027-01");
  });
});

describe("periodAcceptsOrders", () => {
  const open = (period: string) => ({ status: "open" as const, period });

  it("accepts the current month through the last Córdoba minute", () => {
    expect(
      periodAcceptsOrders(open("2026-10"), new Date("2026-11-01T01:00:00Z")),
    ).toEqual({ ok: true, value: "2026-10" });
    expect(
      periodAcceptsOrders(open("2026-10"), new Date("2026-11-01T02:59:00Z")).ok,
    ).toBe(true);
  });

  it("refuses the month once Córdoba midnight passed", () => {
    expect(
      periodAcceptsOrders(open("2026-10"), new Date("2026-11-01T03:00:00Z")),
    ).toEqual({ ok: false, error: { kind: "period-closed" } });
  });

  it("accepts a later open month", () => {
    expect(
      periodAcceptsOrders(open("2026-12"), new Date("2026-10-20T12:00:00Z")).ok,
    ).toBe(true);
  });

  it.each(["draft", "closed"] as const)("refuses a %s period", (status) => {
    expect(
      periodAcceptsOrders(
        { status, period: "2026-10" },
        new Date("2026-10-20T12:00:00Z"),
      ),
    ).toEqual({ ok: false, error: { kind: "period-closed" } });
  });
});
