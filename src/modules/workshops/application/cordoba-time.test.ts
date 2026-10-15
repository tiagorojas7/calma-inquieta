import { describe, expect, it } from "vitest";
import { CORDOBA_UTC_OFFSET, cordobaDateOf } from "./cordoba-time";

describe("cordobaDateOf", () => {
  it("keeps the previous Córdoba day until 03:00 UTC", () => {
    expect(cordobaDateOf(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10-31");
    expect(cordobaDateOf(new Date("2026-11-01T02:59:59Z"))).toBe("2026-10-31");
  });

  it("moves to the next Córdoba day at 03:00 UTC", () => {
    expect(cordobaDateOf(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11-01");
  });

  it("names the fixed offset", () => {
    expect(CORDOBA_UTC_OFFSET).toBe("-03:00");
  });
});

describe("the runtime time-zone data (DA6)", () => {
  it.each([
    ["January", "2026-01-15T12:00:00Z"],
    ["July", "2026-07-15T12:00:00Z"],
  ])("reports GMT-3 for Córdoba in %s", (_month, instant) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Cordoba",
      timeZoneName: "longOffset",
    }).formatToParts(new Date(instant));

    expect(parts.find((part) => part.type === "timeZoneName")?.value).toBe(
      "GMT-03:00",
    );
  });
});
