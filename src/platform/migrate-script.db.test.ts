import { spawnSync } from "node:child_process";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";

describe("scripts/migrate.ts against a real database", () => {
  const database = createTestDatabase({ empty: true });
  afterAll(async () => {
    await (await database).drop();
  });

  it("applies the migrations and exits 0", async () => {
    const { url } = await database;

    const run = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/migrate.ts"],
      {
        env: { ...process.env, MIGRATION_DATABASE_URL: url },
        encoding: "utf8",
        // Below the db project testTimeout (60 s), so a slow start under load
        // still reports the script result instead of a killed process.
        timeout: 55_000,
      },
    );

    expect(run.status).toBe(0);
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      const { rows } = await client.query<{ n: string }>(
        "SELECT count(*) AS n FROM drizzle.__drizzle_migrations",
      );
      expect(Number(rows[0]?.n)).toBe(1);
    } finally {
      await client.end();
    }
  });
});
