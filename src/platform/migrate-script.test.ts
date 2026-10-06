import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function runMigrateScript(env: Record<string, string>) {
  const inherited = { ...process.env };
  delete inherited.MIGRATION_DATABASE_URL;
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/migrate.ts"],
    {
      env: { ...inherited, ...env },
      encoding: "utf8",
      timeout: 30_000,
    },
  );
}

describe("scripts/migrate.ts", () => {
  it("fails naming the variable when MIGRATION_DATABASE_URL is missing", () => {
    const run = runMigrateScript({});

    expect(run.status).toBe(1);
    expect(run.stderr).toContain(
      "Invalid environment: MIGRATION_DATABASE_URL (missing)",
    );
    expect(run.stderr).not.toMatch(/ECONNREFUSED|connect/i);
  });

  it("fails without echoing an invalid value", () => {
    const secret = "secret-token-123";

    const run = runMigrateScript({ MIGRATION_DATABASE_URL: secret });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain("MIGRATION_DATABASE_URL (invalid)");
    expect(`${run.stdout}${run.stderr}`).not.toContain(secret);
  });
});
