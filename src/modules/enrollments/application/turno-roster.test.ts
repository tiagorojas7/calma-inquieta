import { describe, expect, it } from "vitest";
import { rosterFeePaid } from "./turno-roster";

describe("rosterFeePaid", () => {
  it("is paid once the order is paid or beyond, and pending before", () => {
    expect(rosterFeePaid("pending_confirmation")).toBe(false);
    expect(rosterFeePaid("paid")).toBe(true);
    expect(rosterFeePaid("materials_requested")).toBe(true);
    expect(rosterFeePaid("materials_received")).toBe(true);
  });
});
