import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";
import { runMigrations } from "./migrate";

const ids = {
  workshop: "00000000-0000-4000-8000-000000000001",
  period: "00000000-0000-4000-8000-000000000002",
  turno: "00000000-0000-4000-8000-000000000003",
  material: "00000000-0000-4000-8000-000000000004",
  variant: "00000000-0000-4000-8000-000000000005",
  supplier: "00000000-0000-4000-8000-000000000006",
};

interface OrderValues {
  readonly id: string;
  readonly publicId?: string;
  readonly number?: string;
  readonly status?: string;
  readonly email?: string;
  readonly feeCentavos?: number;
  readonly materialsCentavos?: number;
  readonly totalCentavos?: number;
  readonly paidAt?: Date | null;
  readonly paidAmountCentavos?: number | null;
}

function orderValues({
  id,
  publicId = `public_${id.replaceAll("-", "")}`,
  number = `CI-2026-${id.slice(-4)}`,
  status = "pending_confirmation",
  email = `ana+${id.slice(-4)}@example.com`,
  feeCentavos = 5800000,
  materialsCentavos = 0,
  totalCentavos = feeCentavos + materialsCentavos,
  paidAt = null,
  paidAmountCentavos = null,
}: OrderValues) {
  return [
    id,
    publicId,
    number,
    status,
    "public",
    ids.workshop,
    ids.period,
    "2026-10",
    ids.turno,
    "Ceramica",
    "Monday morning",
    1,
    "10:00",
    "12:00",
    "Ana Perez",
    email,
    "5493515551234",
    feeCentavos,
    materialsCentavos,
    totalCentavos,
    "2026-10",
    new Date("2026-10-20T12:00:00.000Z"),
    paidAt,
    paidAmountCentavos,
  ];
}

const INSERT_ORDER = `
  INSERT INTO enrollment_order (
    id, public_id, number, status, source, workshop_id, period_id, period,
    turno_id, workshop_name, turno_label, weekday, starts_at, ends_at,
    student_name, student_email, student_phone_digits, fee_centavos,
    materials_centavos, total_centavos, policy_version, requested_at, paid_at,
    paid_amount_centavos
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
    $17, $18, $19, $20, $21, $22, $23, $24
  )`;

describe("enrollment schema", () => {
  const database = createTestDatabase({ empty: true });
  let client: pg.Client;

  beforeAll(async () => {
    const { url } = await database;
    await runMigrations(url);
    client = new pg.Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await (await database).drop();
  });

  const insertOrder = (values: OrderValues) =>
    client.query(INSERT_ORDER, orderValues(values));

  it("creates the five enrollment-owned tables", async () => {
    const { rows } = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'enrollment_order', 'order_line', 'order_audit',
          'turno_seat_counter', 'order_number_sequence'
        )
      ORDER BY table_name
    `);

    expect(rows).toEqual([
      { table_name: "enrollment_order" },
      { table_name: "order_audit" },
      { table_name: "order_line" },
      { table_name: "order_number_sequence" },
      { table_name: "turno_seat_counter" },
    ]);
  });

  it("rejects invalid order status, totals, whole-peso amounts, and paid-state combinations", async () => {
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000101",
        status: "draft",
      }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000102",
        totalCentavos: 1,
      }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000103",
        feeCentavos: 5800001,
        totalCentavos: 5800001,
      }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000104",
        status: "paid",
      }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000105",
        paidAt: new Date("2026-10-21T12:00:00.000Z"),
        paidAmountCentavos: 5800000,
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects invalid order lines and seat counters", async () => {
    const orderId = "00000000-0000-4000-8000-000000000201";
    await insertOrder({ id: orderId });

    await expect(
      client.query(
        `INSERT INTO order_line (
          order_id, position, material_id, variant_id, material_name,
          variant_label, unit_price_centavos, quantity, supplier_id, supplier_name
        ) VALUES ($1, 0, $2, $3, 'Clay', 'White', 10000, 0, $4, 'Supplier')`,
        [orderId, ids.material, ids.variant, ids.supplier],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        `INSERT INTO order_line (
          order_id, position, material_id, variant_id, material_name,
          variant_label, unit_price_centavos, quantity, supplier_id, supplier_name
        ) VALUES ($1, 0, $2, $3, 'Clay', 'White', 0, 1, $4, 'Supplier')`,
        [orderId, ids.material, ids.variant, ids.supplier],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        `INSERT INTO order_line (
          order_id, position, material_id, variant_id, material_name,
          variant_label, unit_price_centavos, quantity, supplier_id, supplier_name
        ) VALUES ($1, 0, $2, $3, 'Clay', 'White', 101, 1, $4, 'Supplier')`,
        [orderId, ids.material, ids.variant, ids.supplier],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        `INSERT INTO turno_seat_counter (period_id, turno_id, confirmed_seats, capacity)
         VALUES ($1, $2, -1, 8)`,
        [ids.period, ids.turno],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        `INSERT INTO turno_seat_counter (period_id, turno_id, confirmed_seats, capacity)
         VALUES ($1, '00000000-0000-4000-8000-000000000099', 9, 8)`,
        [ids.period],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("enforces normalized active duplicates while allowing cancelled replacement", async () => {
    await insertOrder({
      id: "00000000-0000-4000-8000-000000000301",
      email: "ana@example.com",
    });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000302",
        email: "ana@example.com",
      }),
    ).rejects.toMatchObject({ code: "23505" });
    await client.query(
      "UPDATE enrollment_order SET status = 'cancelled' WHERE id = $1",
      ["00000000-0000-4000-8000-000000000301"],
    );
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000302",
        email: "ana@example.com",
      }),
    ).resolves.toBeDefined();
  });

  it("enforces unique public ids and order numbers", async () => {
    await insertOrder({ id: "00000000-0000-4000-8000-000000000401" });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000402",
        publicId: "public_00000000000040008000000000000401",
      }),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000403",
        number: "CI-2026-0401",
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("accepts valid pending, paid, and cancelled snapshots", async () => {
    await expect(
      insertOrder({ id: "00000000-0000-4000-8000-000000000501" }),
    ).resolves.toBeDefined();
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000502",
        status: "paid",
        paidAt: new Date("2026-10-21T12:00:00.000Z"),
        paidAmountCentavos: 5800000,
      }),
    ).resolves.toBeDefined();
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000503",
        status: "cancelled",
      }),
    ).resolves.toBeDefined();
  });

  it("preserves complete payment snapshots when paid orders are cancelled", async () => {
    const id = "00000000-0000-4000-8000-000000000504";
    const paidAt = new Date("2026-10-21T12:00:00.000Z");
    await insertOrder({
      id,
      status: "paid",
      paidAt,
      paidAmountCentavos: 5800000,
    });

    await client.query(
      "UPDATE enrollment_order SET status = 'cancelled' WHERE id = $1",
      [id],
    );

    const { rows } = await client.query<{
      status: string;
      paid_at: Date;
      paid_amount_centavos: string;
    }>(
      "SELECT status, paid_at, paid_amount_centavos FROM enrollment_order WHERE id = $1",
      [id],
    );
    expect(rows).toEqual([
      {
        status: "cancelled",
        paid_at: paidAt,
        paid_amount_centavos: "5800000",
      },
    ]);

    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000505",
        status: "cancelled",
        paidAt,
        paidAmountCentavos: 5800000,
      }),
    ).resolves.toBeDefined();
  });

  it("rejects cancelled snapshots with incomplete payment fields", async () => {
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000506",
        status: "cancelled",
        paidAt: new Date("2026-10-21T12:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000507",
        status: "cancelled",
        paidAmountCentavos: 5800000,
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("contains no foreign keys to other module tables", async () => {
    const { rows } = await client.query<{ foreign_table_name: string }>(`
      SELECT ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('enrollment_order', 'order_line', 'order_audit')
      ORDER BY tc.table_name, ccu.table_name
    `);

    expect(rows).toEqual([
      { foreign_table_name: "enrollment_order" },
      { foreign_table_name: "enrollment_order" },
    ]);
  });
});
