import { describe, expect, it } from "vitest";
import { intensiveMissing, withIntensiveMissing } from "./intensive-failure";

const at = (query: string) =>
  new Request(`https://panel.example.test/admin/intensivos/i1${query}`);

describe("intensive publish failure code", () => {
  it("carries the missing rules in the query", () => {
    expect(
      withIntensiveMissing("/admin/intensivos/i1", ["price", "teacher"]),
    ).toBe("/admin/intensivos/i1?falta=price,teacher");
    expect(withIntensiveMissing("/admin/intensivos/i1", [])).toBe(
      "/admin/intensivos/i1?falta=",
    );
  });

  it("reads back only known rules", () => {
    expect(intensiveMissing(at("?falta=price,<b>,teacher"))).toEqual([
      "teacher",
      "price",
    ]);
  });

  it("is null when there was no failure and empty for an unknown reason", () => {
    expect(intensiveMissing(at(""))).toBeNull();
    expect(intensiveMissing(at("?falta="))).toEqual([]);
  });
});
