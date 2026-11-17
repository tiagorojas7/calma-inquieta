import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";
import { runMigrations } from "./migrate";

interface Journal {
  entries: { idx: number; tag: string }[];
}

const LAST_LEGACY_IDX = 17;

const INSERT_LEGACY_ORDER = `
  INSERT INTO enrollment_order (
    id, public_id, number, status, source, workshop_id, period_id, period,
    turno_id, workshop_name, turno_label, weekday, starts_at, ends_at,
    student_name, student_email, student_phone_digits, fee_centavos,
    materials_centavos, total_centavos, policy_version, requested_at, paid_at,
    paid_amount_centavos
  ) VALUES (
    $1, $2, $3, $4, 'public', '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002', '2026-10',
    '00000000-0000-4000-8000-000000000003', 'Ceramica', 'Lunes', 1, '10:00',
    '12:00', 'Ana Perez', $5, $8, 5800000, 0, 5800000, '2026-10',
    '2026-10-20T12:00:00Z', $6, $7
  )`;

/** A copy of drizzle/ whose journal stops before 0018, like a database not yet migrated. */
async function legacyMigrationsFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "calma-legacy-orders-"));
  await cp("drizzle", folder, { recursive: true });
  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as Journal;
  journal.entries = journal.entries.filter(
    (entry) => entry.idx <= LAST_LEGACY_IDX,
  );
  await writeFile(journalPath, JSON.stringify(journal));
  return folder;
}

describe("0018 backfill of the order kind", () => {
  const database = createTestDatabase({ empty: true });
  let client: pg.Client;
  let folder: string;

  beforeAll(async () => {
    const { url } = await database;
    folder = await legacyMigrationsFolder();
    const legacy = new pg.Client({ connectionString: url });
    await legacy.connect();
    try {
      await migrate(drizzle(legacy), {
        migrationsFolder: folder,
        migrationsSchema: "drizzle",
        migrationsTable: "__drizzle_migrations",
      });
      const columns = await legacy.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollment_order' AND column_name = 'kind'",
      );
      expect(columns.rows).toHaveLength(0);
      await legacy.query(INSERT_LEGACY_ORDER, [
        "00000000-0000-4000-8000-0000000000a1",
        "order_pending_0000000001",
        "CI-2026-0001",
        "pending_confirmation",
        "ana@example.com",
        null,
        null,
        "5493515550001",
      ]);
      await legacy.query(INSERT_LEGACY_ORDER, [
        "00000000-0000-4000-8000-0000000000a2",
        "order_paid_000000000002",
        "CI-2026-0002",
        "paid",
        "bea@example.com",
        "2026-10-21T12:00:00Z",
        5800000,
        "5493515550002",
      ]);
    } finally {
      await legacy.end();
    }

    await runMigrations(url);
    client = new pg.Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await (await database).drop();
    await rm(folder, { recursive: true, force: true });
  });

  it("makes every existing order a monthly record with no parent", async () => {
    const { rows } = await client.query<{
      number: string;
      kind: string;
      parent_order_id: string | null;
    }>(
      "SELECT number, kind, parent_order_id FROM enrollment_order ORDER BY number",
    );

    expect(rows).toEqual([
      { number: "CI-2026-0001", kind: "enrollment", parent_order_id: null },
      { number: "CI-2026-0002", kind: "enrollment", parent_order_id: null },
    ]);
  });

  it("accepts a material sale under a migrated order, and still allows one active monthly record per student and month", async () => {
    await client.query(
      `INSERT INTO enrollment_order (
         id, student_id, public_id, number, status, source, workshop_id,
         period_id, period, turno_id, workshop_name, turno_label, weekday,
         starts_at, ends_at, student_name, student_email,
         student_phone_digits, fee_centavos, materials_centavos,
         total_centavos, policy_version, requested_at, kind, parent_order_id
       )
       SELECT '00000000-0000-4000-8000-0000000000a3', student_id,
         'sale_0000000000000000003', 'CI-2026-0003', 'pending_confirmation',
         source, workshop_id, period_id, period, turno_id, workshop_name,
         turno_label, weekday, starts_at, ends_at, student_name, student_email,
         student_phone_digits, 0, 400000, 400000, policy_version, requested_at,
         'material_sale', id
       FROM enrollment_order WHERE number = 'CI-2026-0001'`,
    );

    await expect(
      client.query(
        `INSERT INTO enrollment_order (
           id, student_id, public_id, number, status, source, workshop_id,
           period_id, period, turno_id, workshop_name, turno_label, weekday,
           starts_at, ends_at, student_name, student_email,
           student_phone_digits, fee_centavos, materials_centavos,
           total_centavos, policy_version, requested_at
         )
         SELECT '00000000-0000-4000-8000-0000000000a4', student_id,
           'dup_00000000000000000004', 'CI-2026-0004', 'pending_confirmation',
           source, workshop_id, period_id, period, turno_id, workshop_name,
           turno_label, weekday, starts_at, ends_at, student_name,
           student_email, student_phone_digits, 5800000, 0, 5800000,
           policy_version, requested_at
         FROM enrollment_order WHERE number = 'CI-2026-0001'`,
      ),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "enrollment_order_student_period_active_unique",
    });
  });
});
