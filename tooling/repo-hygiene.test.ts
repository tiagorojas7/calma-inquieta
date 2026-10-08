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

// A name may be listed commented out (`# NAME=`): it documents the variable
// without overriding the default that wrangler.jsonc already provides.
function exampleAssignments(file: string): Map<string, string> {
  const assignments = new Map<string, string>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^(?:#\s*)?([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
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

describe("a copied .dev.vars.example", () => {
  // wrangler.jsonc is JSONC with whole-line comments and trailing commas.
  function wranglerVars(): Record<string, string> {
    const json = readFileSync("wrangler.jsonc", "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
      .replace(/,(\s*[}\]])/g, "$1");
    return (JSON.parse(json) as { vars: Record<string, string> }).vars;
  }

  // Active assignments only (a commented line sets nothing), as wrangler reads .dev.vars.
  function devVarsOverrides(file: string): Record<string, string> {
    const overrides: Record<string, string> = {};
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (match?.[1] !== undefined) {
        overrides[match[1]] = match[2] ?? "";
      }
    }
    return overrides;
  }

  const hyperdrive = {
    connectionString: "postgres://u:p@localhost:5432/db",
  };

  it("yields a Worker environment that passes validation", () => {
    const env = {
      ...wranglerVars(),
      ...devVarsOverrides(".dev.vars.example"),
      HYPERDRIVE: hyperdrive,
    };

    expect(workerEnvSchema.safeParse(env).success).toBe(true);
  });

  it("would fail if an example line overrode a default with an empty value", () => {
    const env = {
      ...wranglerVars(),
      SITE_URL: "",
      HYPERDRIVE: hyperdrive,
    };

    expect(workerEnvSchema.safeParse(env).success).toBe(false);
  });
});
