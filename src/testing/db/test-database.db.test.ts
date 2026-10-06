import pg from "pg";
import { describe, expect, it } from "vitest";
import { createTestDatabase } from "./test-database";

async function tablesIn(url: string): Promise<string[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    return rows.map((row) => row.table_name);
  } finally {
    await client.end();
  }
}

async function exists(url: string): Promise<boolean> {
  try {
    await tablesIn(url);
    return true;
  } catch {
    return false;
  }
}

describe("createTestDatabase", () => {
  it("isolates databases and drops them on cleanup", async () => {
    const first = await createTestDatabase();
    const second = await createTestDatabase();
    try {
      const client = new pg.Client({ connectionString: first.url });
      await client.connect();
      await client.query("CREATE TABLE only_in_first (id integer)");
      await client.end();

      await expect(tablesIn(first.url)).resolves.toEqual(["only_in_first"]);
      await expect(tablesIn(second.url)).resolves.toEqual([]);
    } finally {
      await first.drop();
      await second.drop();
    }

    expect(first.name).not.toBe(second.name);
    await expect(exists(first.url)).resolves.toBe(false);
    await expect(exists(second.url)).resolves.toBe(false);
  });

  it("clones the migrated template unless an empty database is requested", async () => {
    const migrated = await createTestDatabase();
    const empty = await createTestDatabase({ empty: true });
    try {
      const count = async (url: string) => {
        const client = new pg.Client({ connectionString: url });
        await client.connect();
        try {
          const { rows } = await client.query<{ n: string }>(
            "SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'drizzle'",
          );
          return Number(rows[0]?.n);
        } finally {
          await client.end();
        }
      };

      await expect(count(migrated.url)).resolves.toBe(1);
      await expect(count(empty.url)).resolves.toBe(0);
    } finally {
      await migrated.drop();
      await empty.drop();
    }
  });
});
