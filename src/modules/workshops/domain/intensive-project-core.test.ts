import { describe, expect, it } from "vitest";
import {
  defaultProjectName,
  validateIntensiveProject,
  type ProjectFieldsDraft,
} from "./intensive-project-core";

const draft = (
  overrides: Partial<ProjectFieldsDraft> = {},
): ProjectFieldsDraft => ({
  name: "Taza de torno",
  price: "30000",
  deposit: "10000",
  ...overrides,
});

const issuesOf = (overrides: Partial<ProjectFieldsDraft>) => {
  const result = validateIntensiveProject(draft(overrides));
  return result.ok ? [] : result.error.issues;
};

describe("validateIntensiveProject", () => {
  it("accepts a name with whole-peso price and deposit and exposes exact centavos", () => {
    const result = validateIntensiveProject(
      draft({ name: "  Taza de torno  ", price: " 30000 ", deposit: " 007 " }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe("Taza de torno");
    expect(result.value.price.toCentavos()).toBe(3_000_000);
    expect(result.value.deposit.toCentavos()).toBe(700);
  });

  it("accepts a deposit equal to the price and a name of exactly 80 characters", () => {
    const result = validateIntensiveProject(
      draft({ name: "n".repeat(80), price: "5000", deposit: "5000" }),
    );

    expect(result.ok).toBe(true);
  });

  it("requires a name of 1 to 80 characters", () => {
    expect(issuesOf({ name: "   " })).toEqual([
      { field: "name", code: "required" },
    ]);
    expect(issuesOf({ name: "n".repeat(81) })).toEqual([
      { field: "name", code: "too-long" },
    ]);
  });

  it("asks for the price in whole pesos and above zero", () => {
    expect(issuesOf({ price: "" })).toContainEqual({
      field: "price",
      code: "required",
    });
    expect(issuesOf({ price: "300.50" })).toContainEqual({
      field: "price",
      code: "invalid-format",
    });
    expect(issuesOf({ price: "abc" })).toContainEqual({
      field: "price",
      code: "invalid-format",
    });
    expect(issuesOf({ price: "0", deposit: "0" })).toEqual(
      expect.arrayContaining([
        { field: "price", code: "out-of-range" },
        { field: "deposit", code: "out-of-range" },
      ]),
    );
  });

  it("asks for the deposit in whole pesos, above zero and never above the price", () => {
    expect(issuesOf({ deposit: "" })).toEqual([
      { field: "deposit", code: "required" },
    ]);
    expect(issuesOf({ deposit: "100.5" })).toEqual([
      { field: "deposit", code: "invalid-format" },
    ]);
    expect(issuesOf({ deposit: "0" })).toEqual([
      { field: "deposit", code: "out-of-range" },
    ]);
    expect(issuesOf({ deposit: "30001" })).toEqual([
      { field: "deposit", code: "exceeds-price" },
    ]);
  });

  it("reports every invalid field at once", () => {
    expect(issuesOf({ name: "", price: "x", deposit: "" })).toEqual([
      { field: "name", code: "required" },
      { field: "price", code: "invalid-format" },
      { field: "deposit", code: "required" },
    ]);
  });
});

describe("defaultProjectName", () => {
  it("keeps the workshop name when it fits", () => {
    expect(defaultProjectName("Cerámica de otoño")).toBe("Cerámica de otoño");
  });

  it("cuts a long workshop name to the project limit without trailing spaces", () => {
    const name = `${"a".repeat(79)} bbbbbbbb`;

    const result = defaultProjectName(name);

    expect(result).toBe("a".repeat(79));
    expect(result.length).toBeLessThanOrEqual(80);
  });
});
