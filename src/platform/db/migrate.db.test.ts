import { readFile } from "node:fs/promises";
import { readMigrationFiles } from "drizzle-orm/migrator";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";
import { runMigrations } from "./migrate";

interface Journal {
  entries: { when: number; tag: string }[];
}

const migrationConfig = { migrationsFolder: "drizzle" };

async function applyMigrationsThrough0010(url: string): Promise<void> {
  const journal = await readJournal();
  const enrollmentMigrationIndex = journal.entries.findIndex((entry) =>
    entry.tag.startsWith("0011_"),
  );
  if (enrollmentMigrationIndex === -1) {
    throw new Error("Missing 0011 enrollment migration");
  }

  const migrations = readMigrationFiles(migrationConfig);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const migration of migrations.slice(0, enrollmentMigrationIndex)) {
      for (const statement of migration.sql) {
        await client.query(statement);
      }
    }
    await client.query("CREATE SCHEMA drizzle");
    await client.query(`
      CREATE TABLE drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    for (const migration of migrations.slice(0, enrollmentMigrationIndex)) {
      await client.query(
        "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
        [migration.hash, migration.folderMillis],
      );
    }
  } finally {
    await client.end();
  }
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

  it("creates only the business tables", async () => {
    const { url } = await database;

    const tables = await query<{ table_name: string }>(
      url,
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );

    expect(tables).toEqual([
      { table_name: "enrollment_order" },
      { table_name: "intensive_image" },
      { table_name: "intensive_workshop" },
      { table_name: "material" },
      { table_name: "material_variant" },
      { table_name: "media_asset" },
      { table_name: "monthly_workshop" },
      { table_name: "order_audit" },
      { table_name: "order_line" },
      { table_name: "order_number_sequence" },
      { table_name: "period_material_offer" },
      { table_name: "period_turno" },
      { table_name: "student_note" },
      { table_name: "supplier" },
      { table_name: "teacher" },
      { table_name: "turno_seat_counter" },
      { table_name: "workshop_period" },
      { table_name: "workshop_turno" },
    ]);
  });

  it("applies 0011 after the 0010 database state without replacing prior tables", async () => {
    const migrationPathDatabase = createTestDatabase({ empty: true });
    const { url } = await migrationPathDatabase;
    try {
      await applyMigrationsThrough0010(url);
      const priorTables = await query<{ table_name: string }>(
        url,
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      );
      expect(priorTables).toEqual([
        { table_name: "intensive_image" },
        { table_name: "intensive_workshop" },
        { table_name: "material" },
        { table_name: "material_variant" },
        { table_name: "media_asset" },
        { table_name: "monthly_workshop" },
        { table_name: "period_material_offer" },
        { table_name: "period_turno" },
        { table_name: "supplier" },
        { table_name: "teacher" },
        { table_name: "workshop_period" },
        { table_name: "workshop_turno" },
      ]);

      await runMigrations(url);

      const tables = await query<{ table_name: string }>(
        url,
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      );
      expect(tables).toEqual(expect.arrayContaining(priorTables));
      expect(tables).toEqual(
        expect.arrayContaining([
          { table_name: "enrollment_order" },
          { table_name: "order_audit" },
          { table_name: "order_line" },
          { table_name: "order_number_sequence" },
          { table_name: "turno_seat_counter" },
        ]),
      );
    } finally {
      await (await migrationPathDatabase).drop();
    }
  });
});
