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

interface ProjectRow {
  intensive_id: string;
  position: number;
  name: string;
}
interface RequestRow {
  id: string;
}
interface StatusRow {
  status: string;
  balance_centavos: string | null;
}

const LAST_LEGACY_IDX = 17;
const LONG_NAME = `Cerámica ${"larga ".repeat(20)}`.trim();

const ids = {
  plain: "00000000-0000-4000-8000-0000000000a1",
  long: "00000000-0000-4000-8000-0000000000a2",
  orphan: "00000000-0000-4000-8000-0000000000af",
  pending: "00000000-0000-4000-8000-0000000000b1",
  confirmed: "00000000-0000-4000-8000-0000000000b2",
  cancelled: "00000000-0000-4000-8000-0000000000b3",
  longRequest: "00000000-0000-4000-8000-0000000000b4",
  orphanRequest: "00000000-0000-4000-8000-0000000000b5",
};

const INSERT_INTENSIVE = `
  INSERT INTO intensive_workshop (
    id, slug, name, summary, description, event_date, starts_at, ends_at,
    price_centavos, deposit_centavos, capacity, min_seats, policy_text,
    materials_included, status, updated_by, updated_at
  ) VALUES (
    $1, $2, $3, 's', 'd', '2026-12-05', '10:00', '14:00', $4, $5, 8, 1, 'p',
    true, 'published', 'admin@example.com', '2026-11-02T12:00:00Z'
  )`;

const INSERT_REQUEST = `
  INSERT INTO intensive_seat_request (
    id, public_id, intensive_id, status, full_name, email, phone_digits,
    policy_accepted_at, created_at, paid_centavos, paid_on
  ) VALUES (
    $1, $2, $3, $4, 'Ana Perez', $5, '5493515551234', now(), now(), $6, $7
  )`;

/** A copy of drizzle/ whose journal stops before 0018, like a database not yet migrated. */
async function legacyMigrationsFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "calma-legacy-migrations-"));
  await cp("drizzle", folder, { recursive: true });
  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as Journal;
  journal.entries = journal.entries.filter(
    (entry) => entry.idx <= LAST_LEGACY_IDX,
  );
  await writeFile(journalPath, JSON.stringify(journal));
  return folder;
}

describe("0018 backfill of workshop projects", () => {
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
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'intensive_seat_request' AND column_name = 'project_id'",
      );
      expect(columns.rows).toHaveLength(0);
      await legacy.query(INSERT_INTENSIVE, [
        ids.plain,
        "ceramica",
        "Cerámica de otoño",
        3000000,
        1000000,
      ]);
      await legacy.query(INSERT_INTENSIVE, [
        ids.long,
        "larga",
        LONG_NAME,
        4500000,
        4500000,
      ]);
      const requests = [
        [ids.pending, ids.plain, "pending_confirmation", "a", null, null],
        [ids.confirmed, ids.plain, "confirmed", "b", 1000000, "2026-11-10"],
        [ids.cancelled, ids.plain, "cancelled", "c", null, null],
        [ids.longRequest, ids.long, "confirmed", "d", 4500000, "2026-11-11"],
        [
          ids.orphanRequest,
          ids.orphan,
          "pending_confirmation",
          "e",
          null,
          null,
        ],
      ] as const;
      for (const [id, intensive, status, tag, paid, paidOn] of requests)
        await legacy.query(INSERT_REQUEST, [
          id,
          `req_${tag}`,
          intensive,
          status,
          `${tag}@example.com`,
          paid,
          paidOn,
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

  it("creates one default project per existing intensivo from its title, price and deposit", async () => {
    const { rows } = await client.query<ProjectRow>(
      `SELECT intensive_id, position, name, media_asset_id, alt,
              price_centavos::int AS price, deposit_centavos::int AS deposit,
              updated_by
         FROM intensive_project ORDER BY name`,
    );

    expect(rows).toHaveLength(2);
    const plain = rows.find((row) => row.intensive_id === ids.plain);
    const long = rows.find((row) => row.intensive_id === ids.long);
    expect(plain).toMatchObject({
      position: 0,
      name: "Cerámica de otoño",
      media_asset_id: null,
      alt: null,
      price: 3000000,
      deposit: 1000000,
    });
    expect(long).toMatchObject({
      position: 0,
      price: 4500000,
      deposit: 4500000,
    });
    expect(long?.name).toBe(LONG_NAME.slice(0, 80).trim());
    expect(String(long?.name).length).toBeLessThanOrEqual(80);
  });

  it("points every existing request at its intensivo's project with the price and deposit snapshot", async () => {
    const { rows } = await client.query<RequestRow>(
      `SELECT r.id, r.status, r.price_centavos::int AS price,
              r.deposit_centavos::int AS deposit, p.intensive_id AS project_intensive
         FROM intensive_seat_request r
         LEFT JOIN intensive_project p ON p.id = r.project_id
        ORDER BY r.id`,
    );

    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const id of [ids.pending, ids.confirmed, ids.cancelled])
      expect(byId.get(id)).toMatchObject({
        project_intensive: ids.plain,
        price: 3000000,
        deposit: 1000000,
      });
    expect(byId.get(ids.longRequest)).toMatchObject({
      project_intensive: ids.long,
      price: 4500000,
      deposit: 4500000,
    });
  });

  it("leaves a request of an unknown intensivo without a project and keeps the old columns and statuses", async () => {
    const orphan = await client.query(
      "SELECT project_id, price_centavos, deposit_centavos FROM intensive_seat_request WHERE id = $1",
      [ids.orphanRequest],
    );
    expect(orphan.rows).toEqual([
      { project_id: null, price_centavos: null, deposit_centavos: null },
    ]);

    const kept = await client.query(
      `SELECT id, status, price_centavos::int AS price, deposit_centavos::int AS deposit
         FROM intensive_workshop ORDER BY id`,
    );
    expect(kept.rows).toEqual([
      { id: ids.plain, status: "published", price: 3000000, deposit: 1000000 },
      { id: ids.long, status: "published", price: 4500000, deposit: 4500000 },
    ]);
    const statuses = await client.query<StatusRow>(
      "SELECT status, balance_centavos FROM intensive_seat_request ORDER BY id",
    );
    expect(statuses.rows.map((row) => row.status)).toEqual([
      "pending_confirmation",
      "confirmed",
      "cancelled",
      "confirmed",
      "pending_confirmation",
    ]);
    expect(statuses.rows.every((row) => row.balance_centavos === null)).toBe(
      true,
    );
  });

  it("starts with no bills of materials and no allocated materials", async () => {
    for (const table of [
      "intensive_project_material",
      "intensive_request_material",
    ]) {
      const { rows } = await client.query(`SELECT 1 FROM ${table}`);
      expect(rows).toHaveLength(0);
    }
  });
});
