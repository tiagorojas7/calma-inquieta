import { describe, expect, it } from "vitest";
import { systemClock } from "./system-clock";

describe("systemClock", () => {
  it("reports the current time on every call", () => {
    const before = Date.now();
    const first = systemClock.now();
    const second = systemClock.now();

    expect(first.getTime()).toBeGreaterThanOrEqual(before);
    expect(second.getTime()).toBeGreaterThanOrEqual(first.getTime());
    expect(first).not.toBe(second);
  });
});
