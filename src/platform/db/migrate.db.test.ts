import { readFile } from "node:fs/promises";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";
import { runMigrations } from "./migrate";

interface Journal {
  entries: { when: number; tag: string }[];
}

async function readJournal(): Promise<Journal> {
  const raw = await readFile("drizzle/meta/_journal.json", "utf8");
  return JSON.parse(raw) as Journal;
}

async function query<T extends pg.QueryResultRow>(url: string, sql: string) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<T>(sql);
    return rows;
  } finally {
    await client.end();
  }
}

const MIGRATIONS = "SELECT created_at FROM drizzle.__drizzle_migrations";

describe("runMigrations", () => {
  const database = createTestDatabase({ empty: true });
  afterAll(async () => {
    await (await database).drop();
  });

  it("applies every journal entry to an empty database", async () => {
    const { url } = await database;
    const journal = await readJournal();

    await runMigrations(url);

    const rows = await query<{ created_at: string }>(url, MIGRATIONS);
    expect(journal.entries.length).toBeGreaterThan(0);
    expect(rows).toHaveLength(journal.entries.length);
  });

  it("stores the journal timestamp as created_at", async () => {
    const { url } = await database;
    const journal = await readJournal();

    const rows = await query<{ created_at: string }>(url, MIGRATIONS);

    expect(rows.map((row) => Number(row.created_at))).toEqual(
      journal.entries.map((entry) => entry.when),
    );
  });

  it("is a no-op when run again", async () => {
    const { url } = await database;
    const before = await query<{ created_at: string }>(url, MIGRATIONS);

    await runMigrations(url);

    const after = await query<{ created_at: string }>(url, MIGRATIONS);
    expect(after).toEqual(before);
  });

  it("creates no business tables in the baseline", async () => {
    const { url } = await database;

    const tables = await query<{ table_name: string }>(
      url,
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );

    expect(tables).toEqual([]);
  });
});
