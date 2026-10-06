import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  migrationEnvSchema,
  testEnvSchema,
  workerEnvSchema,
} from "~/platform/env";

// A Worker binding has no entry in an env file; its local-development override does.
const LOCAL_OVERRIDE: Readonly<Record<string, string>> = {
  HYPERDRIVE: "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE",
};

function exampleAssignments(file: string): Map<string, string> {
  const assignments = new Map<string, string>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match?.[1] !== undefined) {
      assignments.set(match[1], match[2] ?? "");
    }
  }
  return assignments;
}

const examples = new Map([
  ...exampleAssignments(".env.example"),
  ...exampleAssignments(".dev.vars.example"),
]);

const schemaNames = [
  ...Object.keys(workerEnvSchema.shape),
  ...Object.keys(migrationEnvSchema.shape),
  ...Object.keys(testEnvSchema.shape),
].map((name) => LOCAL_OVERRIDE[name] ?? name);

describe("environment example files", () => {
  it("covers every variable the schemas declare", () => {
    expect(schemaNames).toContain("BUILD_COMMIT");
    expect(schemaNames).toContain("MIGRATION_DATABASE_URL");
    expect(schemaNames).toContain("TEST_DATABASE_URL");
    expect(schemaNames).toContain(LOCAL_OVERRIDE["HYPERDRIVE"]);
    for (const name of schemaNames) {
      expect(examples.has(name), `${name} is missing`).toBe(true);
    }
  });

  it("lists names only, never a value", () => {
    expect(examples.size).toBeGreaterThan(0);
    for (const [name, value] of examples) {
      expect(value, `${name} must have no value`).toBe("");
    }
  });
});

describe("secret files", () => {
  const isIgnored = (path: string) =>
    spawnSync("git", ["check-ignore", "--quiet", path]).status === 0;

  it("ignores real env files but not the examples", () => {
    expect(isIgnored(".env")).toBe(true);
    expect(isIgnored(".env.local")).toBe(true);
    expect(isIgnored(".dev.vars")).toBe(true);
    expect(isIgnored(".env.example")).toBe(false);
    expect(isIgnored(".dev.vars.example")).toBe(false);
  });
});
