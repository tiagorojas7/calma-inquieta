import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateDatabaseUpTo } from "~/testing/db/legacy-migrations";
import { createTestDatabase } from "~/testing/db/test-database";
import { runMigrations } from "./migrate";

const LAST_BEFORE_0019_IDX = 18;
const INTENSIVE = "00000000-0000-4000-8000-0000000000a1";
const EXISTING = "00000000-0000-4000-8000-0000000000c1";
const NEW = "00000000-0000-4000-8000-0000000000c2";

const INSERT_INTENSIVE = `
  INSERT INTO intensive_workshop (
    id, slug, name, summary, description, event_date, starts_at, ends_at,
    price_centavos, deposit_centavos, capacity, min_seats, policy_text,
    materials_included, status, updated_by, updated_at
  ) VALUES (
    $1, 'ceramica', 'Cerámica', 's', 'd', '2026-12-05', '10:00', '14:00',
    3000000, 1000000, 8, 1, 'p', true, 'published', 'admin@example.com',
    '2026-11-02T12:00:00Z'
  )`;

const INSERT_EXISTING_PROJECT = `
  INSERT INTO intensive_project (
    id, intensive_id, position, name, price_centavos, deposit_centavos,
    updated_by, updated_at
  ) VALUES (
    $1, $2, 0, 'Taza de torno', 3000000, 1000000, 'admin@example.com',
    '2026-11-02T12:00:00Z'
  )`;

const INSERT_WITH_DESCRIPTION = `
  INSERT INTO intensive_project (
    id, intensive_id, position, name, description, price_centavos,
    deposit_centavos, updated_by, updated_at
  ) VALUES (
    $1, $2, 1, 'Plato', $3, 3000000, 1000000, 'admin@example.com', now()
  )`;

describe("migration 0019 project description", () => {
  const database = createTestDatabase({ empty: true });
  let client: pg.Client;

  beforeAll(async () => {
    const { url } = await database;
    await migrateDatabaseUpTo(url, LAST_BEFORE_0019_IDX);
    const legacy = new pg.Client({ connectionString: url });
    await legacy.connect();
    try {
      const columns = await legacy.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'intensive_project' AND column_name = 'description'",
      );
      expect(columns.rows).toHaveLength(0);
      await legacy.query(INSERT_INTENSIVE, [INTENSIVE]);
      await legacy.query(INSERT_EXISTING_PROJECT, [EXISTING, INTENSIVE]);
    } finally {
      await legacy.end();
    }
    await runMigrations(url);
    client = new pg.Client({ connectionString: url });
    await client.connect();
  }, 120_000);

  afterAll(async () => {
    try {
      await client.end();
    } finally {
      await (await database).drop();
    }
  });

  it("keeps a project that existed before, with every field and no description", async () => {
    const { rows } = await client.query<{
      name: string;
      description: string | null;
      price_centavos: string;
      deposit_centavos: string;
      position: number;
    }>(
      "SELECT name, description, price_centavos, deposit_centavos, position FROM intensive_project WHERE id = $1",
      [EXISTING],
    );

    expect(rows).toEqual([
      {
        name: "Taza de torno",
        description: null,
        price_centavos: "3000000",
        deposit_centavos: "1000000",
        position: 0,
      },
    ]);
  });

  it("accepts a description of 600 characters and a project without one", async () => {
    await client.query(INSERT_WITH_DESCRIPTION, [
      NEW,
      INTENSIVE,
      "d".repeat(600),
    ]);

    const { rows } = await client.query<{ length: number }>(
      "SELECT length(description) AS length FROM intensive_project WHERE id = $1",
      [NEW],
    );
    expect(rows).toEqual([{ length: 600 }]);
    await client.query("DELETE FROM intensive_project WHERE id = $1", [NEW]);
  });

  it.each([
    ["an over-long description", "d".repeat(601)],
    ["a blank description", "   "],
    ["an empty description", ""],
  ])("refuses %s with the description check", async (_title, description) => {
    await expect(
      client.query(INSERT_WITH_DESCRIPTION, [NEW, INTENSIVE, description]),
    ).rejects.toMatchObject({
      constraint: "intensive_project_description_check",
    });
  });

  it("refuses to blank or stretch the description of a stored project", async () => {
    await expect(
      client.query(
        "UPDATE intensive_project SET description = $2 WHERE id = $1",
        [EXISTING, "d".repeat(601)],
      ),
    ).rejects.toMatchObject({
      constraint: "intensive_project_description_check",
    });
  });
});
