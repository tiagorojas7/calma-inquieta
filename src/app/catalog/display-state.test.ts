import { describe, expect, it } from "vitest";
import { seatsIndicator, tallerDisplay } from "./display-state";

const offering = { period: "2026-11" };

describe("tallerDisplay", () => {
  it("returns 'paused' when paused, with or without an offering", () => {
    expect(tallerDisplay("paused", offering)).toBe("paused");
    expect(tallerDisplay("paused", null)).toBe("paused");
  });

  it("returns 'no-offering' when open without an offering", () => {
    expect(tallerDisplay("open", null)).toBe("no-offering");
  });

  it("returns 'open' when open with an offering", () => {
    expect(tallerDisplay("open", offering)).toBe("open");
  });
});

describe("seatsIndicator", () => {
  it("shows 'Cupo limitado' only for an open taller", () => {
    expect(seatsIndicator("open")).toEqual({ kind: "limited" });
    expect(seatsIndicator("paused")).toEqual({ kind: "none" });
    expect(seatsIndicator("no-offering")).toEqual({ kind: "none" });
  });

  it("is derived from the display state alone, never from seats", () => {
    // The only input is the display state: capacity and availability cannot
    // change the indicator (spec: "Cupo limitado" carries no number).
    expect(seatsIndicator.length).toBe(1);
    expect(seatsIndicator(tallerDisplay("open", offering))).toEqual({
      kind: "limited",
    });
    expect(seatsIndicator(tallerDisplay("paused", offering))).toEqual({
      kind: "none",
    });
  });
});
