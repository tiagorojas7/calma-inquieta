import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import journal from "../../../drizzle/meta/_journal.json";
import { migrationTagFor } from "./migration-catalog";

const entries = journal.entries;
const drizzleDir = resolve(import.meta.dirname, "../../../drizzle");

describe("migrationTagFor", () => {
  it("returns the journal tag for a known timestamp", () => {
    const latest = entries[entries.length - 1];
    expect(latest?.tag).toBe("0006_workshop_turnos");
    expect(migrationTagFor(latest?.when ?? 0)).toBe("0006_workshop_turnos");
  });

  it("still resolves the baseline timestamp", () => {
    expect(migrationTagFor(1791287377079)).toBe("0000_baseline");
  });

  it("marks an unknown timestamp without guessing a tag", () => {
    expect(migrationTagFor(42)).toBe("unknown:42");
  });
});

describe("migration journal hygiene", () => {
  it("numbers the tags contiguously from 0000", () => {
    expect(entries.map((entry) => entry.tag.slice(0, 4))).toEqual(
      entries.map((_, index) => String(index).padStart(4, "0")),
    );
    expect(entries.map((entry) => entry.idx)).toEqual(
      entries.map((_, index) => index),
    );
  });

  it.each(entries.map((entry) => entry.tag))(
    "has a SQL file and a valid name for %s",
    (tag) => {
      expect(tag).toMatch(/^\d{4}_[a-z0-9_]+$/);
      expect(existsSync(resolve(drizzleDir, `${tag}.sql`))).toBe(true);
    },
  );

  it("strictly increases `when`, which the drizzle migrator relies on", () => {
    const whens = entries.map((entry) => entry.when);
    whens.slice(1).forEach((when, index) => {
      expect(when).toBeGreaterThan(whens[index] ?? Infinity);
    });
  });
});
