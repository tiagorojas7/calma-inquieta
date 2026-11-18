import { readFile } from "node:fs/promises";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildCollidingOrders,
  buildLegacyDataset,
  insertLegacyDataset,
  insertLegacyOrders,
  type LegacyDataset,
} from "~/testing/db/legacy-0017-dataset";
import { migrateDatabaseUpTo } from "~/testing/db/legacy-migrations";
import { createTestDatabase } from "~/testing/db/test-database";
import { runMigrations } from "./migrate";

/**
 * Rehearsal of migration 0018 over staging-shaped legacy data: the real
 * migration runs over a database migrated to 0017 only and filled with plain
 * SQL, so what it does to rows an old deploy wrote is proven before deploy.
 */

const LAST_LEGACY_IDX = 17;
const MIGRATION_FILE = "drizzle/0018_durable_student_identity.sql";

interface Journal {
  entries: { idx: number; tag: string; when: number }[];
}

type Row = Record<string, unknown>;
interface TableSnapshot {
  columns: string[];
  rows: Row[];
}

const normalize = (email: string): string => email.trim().toLowerCase();

async function connect(url: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

async function publicTables(client: pg.Client): Promise<string[]> {
  const { rows } = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  return rows.map((row) => row.table_name);
}

/** Every public table with every column, ordered by the text of all of them. */
async function snapshot(
  client: pg.Client,
  tables: string[],
  only?: Map<string, TableSnapshot>,
): Promise<Map<string, TableSnapshot>> {
  const result = new Map<string, TableSnapshot>();
  for (const table of tables) {
    let columns = only?.get(table)?.columns;
    if (columns === undefined) {
      const described = await client.query(`SELECT * FROM "${table}" LIMIT 0`);
      columns = described.fields.map((field) => field.name);
    }
    const list = columns.map((column) => `"${column}"`).join(", ");
    const order = columns.map((column) => `"${column}"::text`).join(", ");
    const { rows } = await client.query<Row>(
      `SELECT ${list} FROM "${table}" ORDER BY ${order}`,
    );
    result.set(table, { columns, rows });
  }
  return result;
}

async function one<T extends pg.QueryResultRow>(
  client: pg.Client,
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const { rows } = await client.query<T>(sql, params);
  const first = rows[0];
  if (first === undefined) throw new Error(`No row for: ${sql}`);
  return first;
}

async function journalEntries(): Promise<Journal["entries"]> {
  const journal = JSON.parse(
    await readFile("drizzle/meta/_journal.json", "utf8"),
  ) as Journal;
  return journal.entries;
}

describe("migration 0018 rehearsal over staging-shaped legacy data", () => {
  const database = createTestDatabase({ empty: true });
  const dataset: LegacyDataset = buildLegacyDataset();
  let client: pg.Client;
  let before: Map<string, TableSnapshot>;
  let tablesBefore: string[];

  beforeAll(async () => {
    const { url } = await database;
    await migrateDatabaseUpTo(url, LAST_LEGACY_IDX);

    const legacy = await connect(url);
    try {
      const present = await legacy.query(
        "SELECT to_regclass('public.student') AS student",
      );
      expect(present.rows).toEqual([{ student: null }]);
      await insertLegacyDataset(legacy, dataset);
      tablesBefore = await publicTables(legacy);
      before = await snapshot(legacy, tablesBefore);
    } finally {
      await legacy.end();
    }

    await runMigrations(url);
    client = await connect(url);
  }, 120_000);

  afterAll(async () => {
    try {
      await client.end();
    } finally {
      await (await database).drop();
    }
  });

  it("starts from a dataset shaped like staging: 3 months, every legacy status, the awkward cases", () => {
    const orders = dataset.orders;
    expect(orders.length).toBeGreaterThanOrEqual(60);
    expect(orders.length).toBeLessThanOrEqual(120);
    expect(new Set(orders.map((order) => order.period))).toEqual(
      new Set(["2026-08", "2026-09", "2026-10"]),
    );
    expect(new Set(orders.map((order) => order.status))).toEqual(
      new Set([
        "pending_confirmation",
        "paid",
        "materials_requested",
        "materials_received",
        "cancelled",
      ]),
    );
    expect(new Set(orders.map((order) => order.workshopIndex)).size).toBe(5);
    expect(orders.some((order) => order.lines.length > 0)).toBe(true);
    expect(
      new Set(dataset.seatRequests.map((request) => request.status)),
    ).toEqual(new Set(["pending_confirmation", "confirmed", "cancelled"]));
    expect(dataset.intensives.length).toBeGreaterThanOrEqual(5);
    expect(dataset.privateEvents.length).toBeGreaterThanOrEqual(5);
    // The same student appears in several months, under several spellings.
    const names = new Map<string, Set<string>>();
    for (const order of orders) {
      const key = normalize(order.email);
      names.set(key, (names.get(key) ?? new Set()).add(order.name.trim()));
    }
    expect([...names.values()].some((spellings) => spellings.size > 1)).toBe(
      true,
    );
  });

  it("applies cleanly on top of 0017 and records exactly one new journal entry", async () => {
    const entries = await journalEntries();
    const { rows } = await client.query<{ created_at: string }>(
      "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
    );
    expect(rows).toHaveLength(entries.length);
    expect(entries.at(-1)?.tag).toBe("0018_durable_student_identity");
    expect(rows.map((row) => Number(row.created_at))).toEqual(
      entries.map((entry) => entry.when),
    );
  });

  it("creates one student per distinct normalized email, from the latest order", async () => {
    const latest = new Map<string, { name: string; phone: string; at: Date }>();
    for (const order of dataset.orders) {
      const key = normalize(order.email);
      const seen = latest.get(key);
      if (seen === undefined || order.requestedAt > seen.at) {
        latest.set(key, {
          name: order.name.trim(),
          phone: order.phone,
          at: order.requestedAt,
        });
      }
    }
    const { rows } = await client.query<{
      email: string;
      full_name: string;
      phone_digits: string;
      active: boolean;
      created_at: Date;
      updated_at: Date;
    }>("SELECT * FROM student ORDER BY email");

    expect(rows).toHaveLength(latest.size);
    expect(rows.map((row) => row.email)).toEqual([...latest.keys()].sort());
    for (const row of rows) {
      const expected = latest.get(row.email);
      expect(expected, row.email).toBeDefined();
      expect(row.full_name).toBe(expected?.name);
      expect(row.phone_digits).toBe(expected?.phone);
      expect(row.active).toBe(true);
      expect(row.created_at.getTime()).toBe(expected?.at.getTime());
      expect(row.updated_at.getTime()).toBe(expected?.at.getTime());
    }
  });

  it("takes name and phone from the latest order in the awkward cases", async () => {
    const byEmail = async (email: string) =>
      one<{ full_name: string; phone_digits: string; orders: number }>(
        client,
        `SELECT s.full_name, s.phone_digits,
                (SELECT count(*)::int FROM enrollment_order o WHERE o.student_id = s.id) AS orders
           FROM student s WHERE s.email = $1`,
        [email],
      );

    // A cancelled order followed by a new one in the same month (L13 case a).
    expect(await byEmail("julia.roa@example.com")).toEqual({
      full_name: "Julia Roa Díaz",
      phone_digits: "549351700002",
      orders: 4,
    });
    // Padded and mixed-case emails fold into one student; the name is trimmed.
    expect(await byEmail("marta.sosa@example.com")).toEqual({
      full_name: "Marta  Sosa Vera",
      phone_digits: "549351700010",
      orders: 2,
    });
    // A phone changed across months: the old number is free for someone else.
    expect(await byEmail("nora.vidal@example.com")).toMatchObject({
      phone_digits: "549351600002",
    });
    expect(await byEmail("olga.ponce@example.com")).toMatchObject({
      phone_digits: "549351600001",
    });
    // Seat requesters who never enrolled monthly are not students.
    const { rows } = await client.query(
      "SELECT 1 FROM student WHERE email IN ('repite@example.com', 'cursante.0.1@example.com')",
    );
    expect(rows).toHaveLength(0);
  });

  it("keeps every order with its id, status, amounts and lines, as a monthly record with a student", async () => {
    const { rows } = await client.query<{
      id: string;
      status: string;
      kind: string;
      parent_order_id: string | null;
      fee: string;
      materials: string;
      total: string;
      paid: string | null;
      lines: number;
      student_ok: boolean;
    }>(
      `SELECT o.id, o.status, o.kind, o.parent_order_id,
              o.fee_centavos::text AS fee, o.materials_centavos::text AS materials,
              o.total_centavos::text AS total, o.paid_amount_centavos::text AS paid,
              (SELECT count(*)::int FROM order_line l WHERE l.order_id = o.id) AS lines,
              (s.email = lower(btrim(o.student_email))) AS student_ok
         FROM enrollment_order o JOIN student s ON s.id = o.student_id
        ORDER BY o.number`,
    );
    const expected = [...dataset.orders].sort((a, b) =>
      a.number.localeCompare(b.number),
    );

    expect(rows).toHaveLength(expected.length);
    rows.forEach((row, i) => {
      const order = expected[i];
      expect(row.id).toBe(order?.id);
      expect(row.status).toBe(order?.status);
      expect(row.kind).toBe("enrollment");
      expect(row.parent_order_id).toBeNull();
      expect(Number(row.fee)).toBe(order?.row.fee_centavos);
      expect(Number(row.materials)).toBe(order?.row.materials_centavos);
      expect(Number(row.total)).toBe(order?.row.total_centavos);
      expect(row.paid === null ? null : Number(row.paid)).toBe(
        order?.row.paid_amount_centavos,
      );
      expect(row.lines).toBe(order?.lines.length);
      expect(row.student_ok).toBe(true);
    });
  });

  it("leaves every legacy column of every table exactly as it was, and adds rows only where 0018 creates them", async () => {
    const after = await snapshot(client, tablesBefore, before);
    for (const table of tablesBefore) {
      expect(after.get(table)?.rows, table).toEqual(before.get(table)?.rows);
    }
    const counts = await one<Record<string, number>>(
      client,
      `SELECT (SELECT count(*)::int FROM student) AS student,
              (SELECT count(*)::int FROM intensive_project) AS project,
              (SELECT count(*)::int FROM policy_version) AS policy,
              (SELECT count(*)::int FROM variant_stock) AS variant_stock,
              (SELECT count(*)::int FROM stock_adjustment) AS stock_adjustment,
              (SELECT count(*)::int FROM order_correction) AS correction,
              (SELECT count(*)::int FROM intensive_request_material) AS request_material,
              (SELECT count(*)::int FROM intensive_project_material) AS project_material`,
    );
    expect(counts).toEqual({
      student: new Set(dataset.orders.map((order) => normalize(order.email)))
        .size,
      project: dataset.intensives.length,
      policy: 2,
      variant_stock: 0,
      stock_adjustment: 0,
      correction: 0,
      request_material: 0,
      project_material: 0,
    });
  });

  it("marks every legacy order, seat request and private event seen at its own timestamp", async () => {
    const { rows } = await client.query<{
      t: string;
      total: number;
      seen: number;
    }>(
      `SELECT 'order' AS t, count(*)::int AS total,
              count(*) FILTER (WHERE seen_by = 'migration 0018' AND seen_at = requested_at)::int AS seen
         FROM enrollment_order
       UNION ALL
       SELECT 'seat', count(*)::int,
              count(*) FILTER (WHERE seen_by = 'migration 0018' AND seen_at = created_at)::int
         FROM intensive_seat_request
       UNION ALL
       SELECT 'event', count(*)::int,
              count(*) FILTER (WHERE seen_by = 'migration 0018' AND seen_at = created_at)::int
         FROM private_event_request`,
    );
    const total = (kind: string) => rows.find((row) => row.t === kind);

    expect(total("order")).toMatchObject({
      total: dataset.orders.length,
      seen: dataset.orders.length,
    });
    expect(total("seat")).toMatchObject({
      total: dataset.seatRequests.length,
      seen: dataset.seatRequests.length,
    });
    expect(total("event")).toMatchObject({
      total: dataset.privateEvents.length,
      seen: dataset.privateEvents.length,
    });
  });

  it("seeds exactly one policy version per kind at version 1 and leaves legacy acceptance empty", async () => {
    const { rows } = await client.query<{
      kind: string;
      version: number;
      published_by: string;
      has_body: boolean;
    }>(
      `SELECT kind, version, published_by, body ~ '[^[:space:]]' AS has_body
         FROM policy_version ORDER BY kind`,
    );
    expect(rows).toEqual([
      {
        kind: "conditions",
        version: 1,
        published_by: "migration 0018",
        has_body: true,
      },
      {
        kind: "privacy",
        version: 1,
        published_by: "migration 0018",
        has_body: true,
      },
    ]);
    const accepted = await one<{ orders: number; requests: number }>(
      client,
      `SELECT (SELECT count(*)::int FROM enrollment_order
               WHERE conditions_version IS NOT NULL OR privacy_version IS NOT NULL) AS orders,
              (SELECT count(*)::int FROM intensive_seat_request
               WHERE conditions_version IS NOT NULL OR privacy_version IS NOT NULL) AS requests`,
    );
    expect(accepted).toEqual({ orders: 0, requests: 0 });
  });

  it("gives every legacy intensive and seat request a default project with its price and deposit snapshot", async () => {
    const { rows } = await client.query<{
      id: string;
      intensive_id: string;
      position: number;
      name: string;
      media_asset_id: string | null;
      alt: string | null;
      price: string;
      deposit: string;
      updated_by: string;
      updated_at: Date;
    }>(
      `SELECT id, intensive_id, position, name, media_asset_id, alt,
              price_centavos::text AS price, deposit_centavos::text AS deposit,
              updated_by, updated_at
         FROM intensive_project ORDER BY intensive_id`,
    );
    expect(rows).toHaveLength(dataset.intensives.length);
    const projectOf = new Map<string, string>();
    for (const intensive of dataset.intensives) {
      const project = rows.find((row) => row.intensive_id === intensive.id);
      expect(project, intensive.id).toBeDefined();
      expect(project).toMatchObject({
        position: 0,
        // 0018 keeps the first 80 characters of the trimmed name.
        name: intensive.name.trim().slice(0, 80).trim(),
        media_asset_id: null,
        alt: null,
        price: String(intensive.priceCentavos),
        deposit: String(intensive.depositCentavos),
        updated_by: "migration 0018",
      });
      expect(project?.updated_at.getTime()).toBe(intensive.updatedAt.getTime());
      projectOf.set(intensive.id, project?.id ?? "");
    }

    const requests = await client.query<{
      id: string;
      intensive_id: string;
      project_id: string | null;
      price: string | null;
      deposit: string | null;
      balance: string | null;
      refund: string | null;
    }>(
      `SELECT id, intensive_id, project_id, price_centavos::text AS price,
              deposit_centavos::text AS deposit,
              balance_centavos::text AS balance, refund_centavos::text AS refund
         FROM intensive_seat_request`,
    );
    expect(requests.rows).toHaveLength(dataset.seatRequests.length);
    for (const request of requests.rows) {
      const intensive = dataset.intensives.find(
        (candidate) => candidate.id === request.intensive_id,
      );
      expect(request.project_id).toBe(projectOf.get(request.intensive_id));
      expect(request.price).toBe(String(intensive?.priceCentavos));
      expect(request.deposit).toBe(String(intensive?.depositCentavos));
      expect(request.balance).toBeNull();
      expect(request.refund).toBeNull();
    }
    // The statuses survive the backfill, cancelled requests included.
    const statuses = await client.query<{ id: string; status: string }>(
      "SELECT id, status FROM intensive_seat_request",
    );
    for (const row of statuses.rows) {
      expect(row.status).toBe(
        dataset.seatRequests.find((request) => request.id === row.id)?.status,
      );
    }
  });

  it("gives legacy lines the supplier default with no stock mark and no cost, and variants no cost or stock", async () => {
    const lines = await one<{
      total: number;
      supplier: number;
      cost: number;
      taken: number;
    }>(
      client,
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE source = 'supplier')::int AS supplier,
              count(*) FILTER (WHERE unit_cost_centavos IS NOT NULL)::int AS cost,
              count(*) FILTER (WHERE stock_taken_at IS NOT NULL)::int AS taken
         FROM order_line`,
    );
    const expected = dataset.orders.reduce(
      (sum, order) => sum + order.lines.length,
      0,
    );
    expect(expected).toBeGreaterThan(10);
    expect(lines).toEqual({
      total: expected,
      supplier: expected,
      cost: 0,
      taken: 0,
    });
    const variants = await one<{ costed: number }>(
      client,
      "SELECT count(*) FILTER (WHERE cost_centavos IS NOT NULL)::int AS costed FROM material_variant",
    );
    expect(variants).toEqual({ costed: 0 });
  });

  it("creates every constraint and unique index the migration declares, valid, and no row violates any CHECK or unique rule", async () => {
    const sql = await readFile(MIGRATION_FILE, "utf8");
    const constraints = new Set(
      [...sql.matchAll(/CONSTRAINT "([^"]+)"/g)].map((match) => match[1] ?? ""),
    );
    const indexes = new Set(
      [...sql.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g)].map(
        (match) => match[1] ?? "",
      ),
    );
    expect(constraints.size).toBeGreaterThan(60);
    expect(indexes.size).toBeGreaterThanOrEqual(4);

    const present = await client.query<{ conname: string; valid: boolean }>(
      `SELECT conname, convalidated AS valid FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace`,
    );
    const known = new Map(present.rows.map((row) => [row.conname, row.valid]));
    // PostgreSQL truncates identifiers to 63 bytes (drizzle-kit names one foreign key with 66).
    const missing = [...constraints].filter(
      (name) => !known.has(name.slice(0, 63)),
    );
    expect(missing).toEqual([]);
    expect(present.rows.filter((row) => !row.valid)).toEqual([]);

    const idx = await client.query<{ indexname: string; ok: boolean }>(
      `SELECT c.relname AS indexname, (i.indisvalid AND i.indisready) AS ok
         FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
        WHERE c.relnamespace = 'public'::regnamespace`,
    );
    const names = new Set(idx.rows.map((row) => row.indexname));
    expect([...indexes].filter((name) => !names.has(name))).toEqual([]);
    expect(idx.rows.filter((row) => !row.ok)).toEqual([]);
    // The old partial unique index is replaced, not kept beside the new one.
    expect(names.has("enrollment_order_active_duplicate_unique")).toBe(false);
    expect(names.has("enrollment_order_student_period_active_unique")).toBe(
      true,
    );

    // Violation queries: every CHECK evaluated over the migrated rows.
    const checks = await client.query<{ tbl: string; def: string }>(
      `SELECT conrelid::regclass::text AS tbl, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE contype = 'c' AND connamespace = 'public'::regnamespace`,
    );
    expect(checks.rows.length).toBeGreaterThan(80);
    const violations: string[] = [];
    for (const check of checks.rows) {
      const expression = check.def
        .replace(/^CHECK\s*/, "")
        .replace(/\s+NOT VALID$/, "");
      const { rows } = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM ${check.tbl} WHERE (${expression}) IS FALSE`,
      );
      if (rows[0]?.n !== 0) violations.push(`${check.tbl}: ${check.def}`);
    }
    expect(violations).toEqual([]);

    // Violation queries for the new unique rules, which return no rows.
    const duplicates = await client.query(
      `SELECT 'student email' AS rule FROM student GROUP BY email HAVING count(*) > 1
       UNION ALL
       SELECT 'student phone' FROM student GROUP BY phone_digits HAVING count(*) > 1
       UNION ALL
       SELECT 'active record per student and month' FROM enrollment_order
        WHERE status <> 'cancelled' AND kind = 'enrollment'
        GROUP BY student_id, period HAVING count(*) > 1
       UNION ALL
       SELECT 'policy version' FROM policy_version GROUP BY kind, version HAVING count(*) > 1
       UNION ALL
       SELECT 'project position' FROM intensive_project
        GROUP BY intensive_id, position HAVING count(*) > 1`,
    );
    expect(duplicates.rows).toEqual([]);
  });

  describe("the new rules refuse bad rows over the migrated data", () => {
    async function refused(
      statement: string,
      params: unknown[],
    ): Promise<{ code?: string | undefined; constraint?: string | undefined }> {
      await client.query("BEGIN");
      try {
        await client.query(statement, params);
        return {};
      } catch (error) {
        const { code, constraint } = error as pg.DatabaseError;
        return { code, constraint };
      } finally {
        await client.query("ROLLBACK");
      }
    }

    const COPY_ORDER = `
      INSERT INTO enrollment_order
      SELECT (jsonb_populate_record(NULL::enrollment_order,
               to_jsonb(o) || jsonb_build_object('id', $1::text, 'public_id', $2::text, 'number', $3::text))).*
        FROM enrollment_order o WHERE o.id = $4`;

    it("refuses a second active monthly record for the same student and month, whatever the workshop", async () => {
      const active = dataset.orders.find((order) => order.status === "paid");
      expect(
        await refused(COPY_ORDER, [
          "00000000-0000-4000-8000-ffffffffff01",
          "order_probe_00000000001",
          "CI-2026-9001",
          active?.id,
        ]),
      ).toEqual({
        code: "23505",
        constraint: "enrollment_order_student_period_active_unique",
      });
    });

    it("still accepts another cancelled record in a month that has an active one", async () => {
      const cancelled = dataset.orders.find(
        (order) => order.status === "cancelled" && order.row.paid_at === null,
      );
      expect(
        await refused(COPY_ORDER, [
          "00000000-0000-4000-8000-ffffffffff02",
          "order_probe_00000000002",
          "CI-2026-9002",
          cancelled?.id,
        ]),
      ).toEqual({});
    });

    it("refuses a second student with the same phone", async () => {
      expect(
        await refused(
          `INSERT INTO student (id, full_name, email, phone_digits, created_at, updated_at)
           SELECT '00000000-0000-4000-8000-ffffffffff03', 'Otra Persona', 'otra@example.com',
                  phone_digits, now(), now() FROM student LIMIT 1`,
          [],
        ),
      ).toEqual({ code: "23505", constraint: "student_phone_digits_unique" });
    });

    it("refuses a half-set seen mark and an acceptance version without its pair", async () => {
      expect(
        await refused(
          "UPDATE enrollment_order SET seen_by = NULL WHERE id = $1",
          [dataset.orders[0]?.id],
        ),
      ).toEqual({ code: "23514", constraint: "enrollment_order_seen_check" });
      expect(
        await refused(
          "UPDATE enrollment_order SET conditions_version = 1 WHERE id = $1",
          [dataset.orders[0]?.id],
        ),
      ).toEqual({
        code: "23514",
        constraint: "enrollment_order_acceptance_check",
      });
    });
  });
});

describe.each([
  {
    title:
      "the same email in two workshops in one month, both active (L13 case b)",
    kind: "same-email-two-workshops",
    constraint: "enrollment_order_student_period_active_unique",
  },
  {
    title: "two emails sharing one latest phone (L13 case c)",
    kind: "shared-latest-phone",
    constraint: "student_phone_digits_unique",
  },
] as const)("migration 0018 fails closed on $title", ({ kind, constraint }) => {
  const database = createTestDatabase({ empty: true });
  let url: string;
  let tables: string[];
  let before: Map<string, TableSnapshot>;
  let failure: unknown;

  beforeAll(async () => {
    ({ url } = await database);
    await migrateDatabaseUpTo(url, LAST_LEGACY_IDX);
    const dataset = buildLegacyDataset();
    const legacy = await connect(url);
    try {
      await insertLegacyDataset(legacy, dataset);
      await insertLegacyOrders(legacy, buildCollidingOrders(kind, dataset));
      tables = await publicTables(legacy);
      before = await snapshot(legacy, tables);
    } finally {
      await legacy.end();
    }
    failure = await runMigrations(url).then(
      () => undefined,
      (error: unknown) => error,
    );
  }, 120_000);

  afterAll(async () => {
    await (await database).drop();
  });

  it("refuses to apply, naming the rule that the legacy data breaks", () => {
    expect(failure).toBeInstanceOf(Error);
    // The migrator wraps the driver error as the cause of a "Failed query" error.
    const cause = (failure as Error).cause as pg.DatabaseError;
    expect({ code: cause.code, constraint: cause.constraint }).toEqual({
      code: "23505",
      constraint,
    });
  });

  it("leaves the database at 0017: no student table, no 0018 journal entry, the old index and every legacy row intact", async () => {
    const client = await connect(url);
    try {
      const entries = await journalEntries();
      const applied = await client.query<{ created_at: string }>(
        "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
      );
      const last = entries.find((entry) => entry.idx === LAST_LEGACY_IDX);
      const migration = entries.find((entry) => entry.idx === 18);
      expect(applied.rows.map((row) => Number(row.created_at))).not.toContain(
        migration?.when,
      );
      expect(applied.rows).toHaveLength(LAST_LEGACY_IDX + 1);
      expect(Number(applied.rows.at(-1)?.created_at)).toBe(last?.when);

      const objects = await one<Record<string, unknown>>(
        client,
        `SELECT to_regclass('public.student') AS student,
                to_regclass('public.policy_version') AS policy,
                to_regclass('public.intensive_project') AS project,
                to_regclass('public.enrollment_order_active_duplicate_unique') AS old_index,
                (SELECT count(*)::int FROM information_schema.columns
                  WHERE table_name = 'enrollment_order'
                    AND column_name IN ('student_id', 'kind', 'seen_at')) AS new_columns`,
      );
      expect(objects).toEqual({
        student: null,
        policy: null,
        project: null,
        old_index: "enrollment_order_active_duplicate_unique",
        new_columns: 0,
      });

      expect(await publicTables(client)).toEqual(tables);
      const after = await snapshot(client, tables, before);
      for (const table of tables) {
        expect(after.get(table)?.rows, table).toEqual(before.get(table)?.rows);
      }
    } finally {
      await client.end();
    }
  });
});
