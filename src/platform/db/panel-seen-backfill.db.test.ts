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
    materials_centavos, total_centavos, policy_version, requested_at
  ) VALUES (
    '00000000-0000-4000-8000-0000000000a1', 'order_legacy_0000000001',
    'CI-2026-0001', 'pending_confirmation', 'public',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002', '2026-10',
    '00000000-0000-4000-8000-000000000003', 'Ceramica', 'Lunes', 1, '10:00',
    '12:00', 'Ana Perez', 'ana@example.com', '5493515550001', 5800000, 0,
    5800000, '2026-10', '2026-10-20T12:00:00Z'
  )`;

const INSERT_LEGACY_REQUEST = `
  INSERT INTO intensive_seat_request (
    id, public_id, intensive_id, status, full_name, email, phone_digits,
    policy_accepted_at, created_at
  ) VALUES (
    '00000000-0000-4000-8000-0000000000b1', 'request_legacy_000001',
    '00000000-0000-4000-8000-0000000000c1', 'pending_confirmation',
    'Bea Gomez', 'bea@example.com', '5493515550002',
    '2026-10-21T12:00:00Z', '2026-10-21T12:00:00Z'
  )`;

const INSERT_LEGACY_EVENT = `
  INSERT INTO private_event_request (
    id, status, full_name, phone_digits, email, desired_date, place,
    participants, created_at
  ) VALUES (
    '00000000-0000-4000-8000-0000000000d1', 'nueva', 'Cleo Diaz',
    '5493515550003', NULL, '2026-12-05', 'Casa', 12, '2026-10-22T12:00:00Z'
  )`;

/** A copy of drizzle/ whose journal stops before 0018, like a database not yet migrated. */
async function legacyMigrationsFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "calma-legacy-seen-"));
  await cp("drizzle", folder, { recursive: true });
  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as Journal;
  journal.entries = journal.entries.filter(
    (entry) => entry.idx <= LAST_LEGACY_IDX,
  );
  await writeFile(journalPath, JSON.stringify(journal));
  return folder;
}

describe("0018 backfill of the shared read state", () => {
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
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'private_event_request' AND column_name = 'seen_at'",
      );
      expect(columns.rows).toHaveLength(0);
      await legacy.query(INSERT_LEGACY_ORDER);
      await legacy.query(INSERT_LEGACY_REQUEST);
      await legacy.query(INSERT_LEGACY_EVENT);
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

  it.each([
    ["enrollment_order", "requested_at"],
    ["intensive_seat_request", "created_at"],
    ["private_event_request", "created_at"],
  ] as const)(
    "marks every existing %s row seen at its own timestamp, so the bell starts at zero",
    async (table, timestamp) => {
      const { rows } = await client.query<{
        seen_by: string | null;
        same_instant: boolean;
      }>(
        `SELECT seen_by, (seen_at = ${timestamp}) AS same_instant FROM ${table}`,
      );

      expect(rows).toEqual([{ seen_by: "migration 0018", same_instant: true }]);
    },
  );

  it("leaves a row inserted after the migration unseen, and refuses a half-set mark", async () => {
    await client.query(
      `INSERT INTO private_event_request (
         id, status, full_name, phone_digits, email, desired_date, place,
         participants, created_at
       ) VALUES (
         '00000000-0000-4000-8000-0000000000d2', 'nueva', 'Dora Ruiz',
         '5493515550004', NULL, '2026-12-06', 'Salon', 8, now()
       )`,
    );

    const { rows } = await client.query<{ seen_at: Date | null }>(
      "SELECT seen_at FROM private_event_request WHERE full_name = 'Dora Ruiz'",
    );
    expect(rows).toEqual([{ seen_at: null }]);
    await expect(
      client.query(
        "UPDATE private_event_request SET seen_by = 'someone' WHERE full_name = 'Dora Ruiz'",
      ),
    ).rejects.toThrow();
    await expect(
      client.query("UPDATE enrollment_order SET seen_at = NULL"),
    ).rejects.toThrow();
    await expect(
      client.query("UPDATE intensive_seat_request SET seen_by = NULL"),
    ).rejects.toThrow();
  });
});
