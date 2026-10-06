import { describe, expect, it } from "vitest";
import { advancingClock, fixedClock } from "./fixed-clock";

describe("fixedClock", () => {
  it("returns the same instant on every call", () => {
    const clock = fixedClock(new Date("2026-10-05T12:00:00Z"));

    expect(clock.now().toISOString()).toBe("2026-10-05T12:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-10-05T12:00:00.000Z");
  });

  it("does not let callers mutate the fixed instant", () => {
    const clock = fixedClock(new Date("2026-10-05T12:00:00Z"));

    clock.now().setUTCFullYear(1999);

    expect(clock.now().toISOString()).toBe("2026-10-05T12:00:00.000Z");
  });
});

describe("advancingClock", () => {
  it("starts at the given instant and moves by the requested delta", () => {
    const clock = advancingClock(new Date("2026-10-05T12:00:00Z"));

    expect(clock.now().toISOString()).toBe("2026-10-05T12:00:00.000Z");
    clock.advance(60_000);
    expect(clock.now().toISOString()).toBe("2026-10-05T12:01:00.000Z");
  });

  it("accumulates successive advances", () => {
    const clock = advancingClock(new Date("2026-10-05T12:00:00Z"));

    clock.advance(1_000);
    clock.advance(2_500);

    expect(clock.now().getTime()).toBe(
      new Date("2026-10-05T12:00:03.500Z").getTime(),
    );
  });
});
