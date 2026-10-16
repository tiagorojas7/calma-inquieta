import { describe, expect, it } from "vitest";
import config from "../vitest.config";

function project(name: string) {
  const projects: readonly unknown[] = config.test?.projects ?? [];
  for (const entry of projects) {
    const test: unknown =
      typeof entry === "object" && entry !== null
        ? Reflect.get(entry, "test")
        : undefined;
    if (typeof test === "object" && test !== null) {
      if (Reflect.get(test, "name") === name) return test;
    }
  }
  throw new Error(`missing Vitest project ${name}`);
}

describe("Vitest project separation", () => {
  it("keeps R2 simulation suites out of the unit project", () => {
    expect(Reflect.get(project("unit"), "exclude")).toContain(
      "**/*.r2.test.ts",
    );
  });

  it("runs R2 simulation suites in the db project", () => {
    expect(Reflect.get(project("db"), "include")).toContain(
      "src/**/*.r2.test.ts",
    );
  });
});
