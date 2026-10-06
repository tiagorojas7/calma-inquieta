import { describe, expect, it } from "vitest";
import { migrationTagFor } from "./migration-catalog";

describe("migrationTagFor", () => {
  it("returns the journal tag for a known timestamp", () => {
    expect(migrationTagFor(1791287377079)).toBe("0000_baseline");
  });

  it("marks an unknown timestamp without guessing a tag", () => {
    expect(migrationTagFor(42)).toBe("unknown:42");
  });
});
