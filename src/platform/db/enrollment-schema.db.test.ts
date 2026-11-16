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
    paid_amount_centavos, student_id
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
    $17, $18, $19, $20, $21, $22, $23, $24, md5($16)::uuid
  )`;

// One durable profile per email, each with its own phone (both are unique).
const INSERT_STUDENT = `
  INSERT INTO student (id, full_name, email, phone_digits, created_at, updated_at)
  VALUES (md5($1)::uuid, 'Ana Perez', $1, $2, now(), now())
  ON CONFLICT (id) DO NOTHING`;

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

  const phones = new Map<string, string>();
  const insertOrder = async (values: OrderValues) => {
    const order = orderValues(values);
    const email = String(order[15]);
    const phone =
      phones.get(email) ?? `549351${String(phones.size).padStart(7, "0")}`;
    phones.set(email, phone);
    await client.query(INSERT_STUDENT, [email, phone]);
    return client.query(INSERT_ORDER, order);
  };

  it("creates the seven enrollment-owned tables", async () => {
    const { rows } = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'enrollment_order', 'order_line', 'order_audit',
          'order_correction', 'turno_seat_counter',
          'order_number_sequence', 'student'
        )
      ORDER BY table_name
    `);

    expect(rows).toEqual([
      { table_name: "enrollment_order" },
      { table_name: "order_audit" },
      { table_name: "order_correction" },
      { table_name: "order_line" },
      { table_name: "order_number_sequence" },
      { table_name: "student" },
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

  it("accepts a zero fee for a free enrollment, paid with $0, and still rejects a negative fee", async () => {
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000106",
        email: "free@example.com",
        feeCentavos: 0,
        totalCentavos: 0,
        status: "paid",
        paidAt: new Date("2026-10-21T12:00:00.000Z"),
        paidAmountCentavos: 0,
      }),
    ).resolves.toBeDefined();
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000107",
        email: "negative@example.com",
        feeCentavos: -100,
        totalCentavos: -100,
      }),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "enrollment_order_fee_check",
    });
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

  it("allows one active order per student and month, and a cancelled one frees the month", async () => {
    await insertOrder({
      id: "00000000-0000-4000-8000-000000000301",
      email: "ana@example.com",
    });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000302",
        email: "ana@example.com",
      }),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "enrollment_order_student_period_active_unique",
    });
    await client.query(
      "UPDATE enrollment_order SET status = 'cancelled' WHERE id = $1",
      ["00000000-0000-4000-8000-000000000301"],
    );
    await insertOrder({
      id: "00000000-0000-4000-8000-000000000302",
      email: "ana@example.com",
    });
    await expect(
      insertOrder({
        id: "00000000-0000-4000-8000-000000000303",
        email: "ana@example.com",
      }),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "enrollment_order_student_period_active_unique",
    });
    const stored = await client.query<{ status: string }>(
      "SELECT status FROM enrollment_order WHERE student_id = (SELECT id FROM student WHERE email = $1) ORDER BY id",
      ["ana@example.com"],
    );
    expect(stored.rows.map((row) => row.status)).toEqual([
      "cancelled",
      "pending_confirmation",
    ]);
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

  describe("refund columns", () => {
    const paidAt = new Date("2026-10-21T12:00:00.000Z");
    const refundedAt = new Date("2026-10-25T03:00:00.000Z");
    const PAID = 5800000;

    const paidOrder = async (id: string, status = "paid") => {
      await insertOrder({
        id,
        status,
        paidAt,
        paidAmountCentavos: PAID,
      });
      return id;
    };
    const refund = (
      id: string,
      values: {
        status?: string;
        amount?: number | null;
        at?: Date | null;
        by?: string | null;
        note?: string | null;
      },
    ) =>
      client.query(
        `UPDATE enrollment_order SET status = $2, refunded_amount_centavos = $3,
           refunded_at = $4, refunded_by = $5, refund_note = $6 WHERE id = $1`,
        [
          id,
          values.status ?? "cancelled",
          values.amount === undefined ? 0 : values.amount,
          values.at === undefined ? refundedAt : values.at,
          values.by === undefined ? "admin@example.com" : values.by,
          values.note === undefined ? null : values.note,
        ],
      );

    it.each([
      ["nothing returned", 0],
      ["a partial amount", 2500000],
      ["the full paid amount", PAID],
    ])(
      "keeps the payment and accepts a refund of %s",
      async (_label, cents) => {
        const id = await paidOrder(
          `00000000-0000-4000-8000-0000000006${String(cents).slice(0, 2).padStart(2, "0")}`,
        );

        await refund(id, { amount: cents, note: "transfer back" });

        const { rows } = await client.query<{
          paid_amount_centavos: string;
          refunded_amount_centavos: string;
        }>(
          "SELECT paid_amount_centavos, refunded_amount_centavos FROM enrollment_order WHERE id = $1",
          [id],
        );
        expect(rows).toEqual([
          {
            paid_amount_centavos: String(PAID),
            refunded_amount_centavos: String(cents),
          },
        ]);
      },
    );

    it("rejects a refund above what was paid or below zero", async () => {
      const above = await paidOrder("00000000-0000-4000-8000-000000000701");
      await expect(refund(above, { amount: PAID + 100 })).rejects.toMatchObject(
        { code: "23514", constraint: "enrollment_order_refund_bounds_check" },
      );
      const negative = await paidOrder("00000000-0000-4000-8000-000000000702");
      await expect(refund(negative, { amount: -100 })).rejects.toMatchObject({
        code: "23514",
        constraint: "enrollment_order_refund_bounds_check",
      });
    });

    it("rejects a refund with cents", async () => {
      const id = await paidOrder("00000000-0000-4000-8000-000000000703");
      await expect(refund(id, { amount: 1050 })).rejects.toMatchObject({
        code: "23514",
        constraint: "enrollment_order_refund_whole_pesos_check",
      });
    });

    it("rejects a refund on an order that is not cancelled", async () => {
      const id = await paidOrder("00000000-0000-4000-8000-000000000704");
      await expect(refund(id, { status: "paid" })).rejects.toMatchObject({
        code: "23514",
        constraint: "enrollment_order_refund_state_check",
      });
    });

    it("rejects a refund on a cancelled order that was never paid", async () => {
      const id = "00000000-0000-4000-8000-000000000705";
      await insertOrder({ id });
      await expect(refund(id, {})).rejects.toMatchObject({ code: "23514" });
    });

    it.each([
      ["without a date", { at: null }],
      ["without who recorded it", { by: null }],
      ["without an amount", { amount: null, note: "orphan note" }],
    ])("rejects a refund %s", async (_label, values) => {
      const id = await paidOrder(
        `00000000-0000-4000-8000-00000000071${String(_label.length % 10)}`,
      );
      await expect(refund(id, values)).rejects.toMatchObject({
        code: "23514",
        constraint: "enrollment_order_refund_state_check",
      });
    });
  });

  describe("order corrections", () => {
    const paidAt = new Date("2026-10-21T12:00:00.000Z");
    const at = new Date("2026-10-28T12:00:00.000Z");
    const PAID = 5800000;
    let sequence = 0;

    const paidOrder = async () => {
      sequence += 1;
      const id = `00000000-0000-4000-8000-0000000008${String(sequence).padStart(2, "0")}`;
      await insertOrder({
        id,
        status: "paid",
        paidAt,
        paidAmountCentavos: PAID,
      });
      return id;
    };

    /** A lowered paid order: fee 58000 down to 50000 with 8000 given back. */
    const base = (orderId: string): Record<string, unknown> => ({
      id: crypto.randomUUID(),
      order_id: orderId,
      at,
      actor: "admin@example.com",
      note: null,
      before_workshop_id: ids.workshop,
      before_workshop_name: "Ceramica",
      before_period_id: ids.period,
      before_period: "2026-10",
      before_turno_id: ids.turno,
      before_turno_label: "Monday morning",
      before_weekday: 1,
      before_starts_at: "10:00",
      before_ends_at: "12:00",
      before_fee_centavos: PAID,
      before_total_centavos: PAID,
      before_status: "paid",
      after_workshop_id: ids.workshop,
      after_workshop_name: "Ceramica",
      after_period_id: ids.period,
      after_period: "2026-10",
      after_turno_id: ids.turno,
      after_turno_label: "Monday morning",
      after_weekday: 1,
      after_starts_at: "10:00",
      after_ends_at: "12:00",
      after_fee_centavos: 5000000,
      after_total_centavos: 5000000,
      after_status: "paid",
      previous_paid_amount_centavos: null,
      previous_paid_at: null,
      previous_confirmed_by: null,
      refunded_amount_centavos: 800000,
      refunded_at: new Date("2026-10-28T03:00:00.000Z"),
      refund_note: null,
    });
    const insertCorrection = (values: Record<string, unknown>) => {
      const columns = Object.keys(values);
      return client.query(
        `INSERT INTO order_correction (${columns.join(", ")})
         VALUES (${columns.map((_, index) => `$${String(index + 1)}`).join(", ")})`,
        Object.values(values),
      );
    };
    /** A raised total: fee 58000 up to 60000, back to pending with the old payment kept. */
    const raised = (orderId: string): Record<string, unknown> => ({
      ...base(orderId),
      after_fee_centavos: 6000000,
      after_total_centavos: 6000000,
      after_status: "pending_confirmation",
      previous_paid_amount_centavos: PAID,
      previous_paid_at: paidAt,
      previous_confirmed_by: "admin@example.com",
      refunded_amount_centavos: null,
      refunded_at: null,
    });
    const rejected = (constraint: string) => ({ code: "23514", constraint });

    it.each([
      ["a lowered paid order with the refunded difference", base],
      ["a raised total with the previous payment kept", raised],
      [
        "a pending order that stays pending",
        (orderId: string) => ({
          ...base(orderId),
          before_status: "pending_confirmation",
          after_status: "pending_confirmation",
          refunded_amount_centavos: null,
          refunded_at: null,
        }),
      ],
      [
        "a paid order whose total is unchanged",
        (orderId: string) => ({
          ...base(orderId),
          after_fee_centavos: PAID,
          after_total_centavos: PAID,
          refunded_amount_centavos: null,
          refunded_at: null,
        }),
      ],
    ])("accepts %s", async (_label, build) => {
      await expect(insertCorrection(build(await paidOrder()))).resolves.toEqual(
        expect.objectContaining({ rowCount: 1 }),
      );
    });

    it.each([
      ["nothing", 0],
      ["the whole difference", 800000],
    ])("accepts a refunded difference of %s", async (_label, cents) => {
      await expect(
        insertCorrection({
          ...base(await paidOrder()),
          refunded_amount_centavos: cents,
        }),
      ).resolves.toEqual(expect.objectContaining({ rowCount: 1 }));
    });

    it.each([
      ["above the difference", { refunded_amount_centavos: 800100 }],
      ["negative", { refunded_amount_centavos: -100 }],
      ["with cents", { refunded_amount_centavos: 5050 }],
      ["without a date", { refunded_amount_centavos: 100, refunded_at: null }],
    ])("rejects a refunded difference %s", async (_label, values) => {
      await expect(
        insertCorrection({ ...base(await paidOrder()), ...values }),
      ).rejects.toMatchObject(rejected("order_correction_refund_check"));
    });

    it("rejects a lowered paid order that records no refund", async () => {
      await expect(
        insertCorrection({
          ...base(await paidOrder()),
          refunded_amount_centavos: null,
          refunded_at: null,
        }),
      ).rejects.toMatchObject(rejected("order_correction_refund_check"));
    });

    it("rejects a refund when the total did not drop", async () => {
      await expect(
        insertCorrection({
          ...raised(await paidOrder()),
          refunded_amount_centavos: 100,
          refunded_at: at,
        }),
      ).rejects.toMatchObject(rejected("order_correction_refund_check"));
    });

    it("rejects a raised total that keeps no previous payment", async () => {
      await expect(
        insertCorrection({
          ...raised(await paidOrder()),
          previous_paid_amount_centavos: null,
          previous_paid_at: null,
          previous_confirmed_by: null,
        }),
      ).rejects.toMatchObject(
        rejected("order_correction_previous_payment_check"),
      );
    });

    it("rejects a previous payment that is not what was paid", async () => {
      await expect(
        insertCorrection({
          ...raised(await paidOrder()),
          previous_paid_amount_centavos: PAID - 100,
        }),
      ).rejects.toMatchObject(
        rejected("order_correction_previous_payment_check"),
      );
    });

    it("rejects a previous payment on a correction that never left paid", async () => {
      await expect(
        insertCorrection({
          ...base(await paidOrder()),
          previous_paid_amount_centavos: PAID,
          previous_paid_at: paidAt,
        }),
      ).rejects.toMatchObject(
        rejected("order_correction_previous_payment_check"),
      );
    });

    it.each([
      [
        "a paid order that goes pending without a higher total",
        { after_status: "pending_confirmation" },
      ],
      [
        "a higher total that stays paid",
        {
          after_fee_centavos: 6000000,
          after_total_centavos: 6000000,
          refunded_amount_centavos: null,
          refunded_at: null,
        },
      ],
      [
        "a pending order that becomes paid",
        {
          before_status: "pending_confirmation",
          refunded_amount_centavos: null,
          refunded_at: null,
        },
      ],
      [
        "a paid order that changes paid state",
        { after_status: "materials_received" },
      ],
    ])("rejects %s", async (_label, values) => {
      await expect(
        insertCorrection({ ...base(await paidOrder()), ...values }),
      ).rejects.toMatchObject({ code: "23514" });
    });

    it("rejects a cancelled order on either side", async () => {
      await expect(
        insertCorrection({
          ...base(await paidOrder()),
          before_status: "cancelled",
        }),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        insertCorrection({
          ...base(await paidOrder()),
          after_status: "cancelled",
        }),
      ).rejects.toMatchObject({ code: "23514" });
    });

    it.each([
      ["a fee with cents", { after_fee_centavos: 5000050 }],
      ["a negative fee", { after_fee_centavos: -100 }],
      [
        "changed materials",
        { after_fee_centavos: 5000000, after_total_centavos: 5100000 },
      ],
    ])("rejects %s", async (_label, values) => {
      await expect(
        insertCorrection({ ...base(await paidOrder()), ...values }),
      ).rejects.toMatchObject(rejected("order_correction_amounts_check"));
    });

    it("rejects a weekday or a time range that is not valid", async () => {
      await expect(
        insertCorrection({ ...base(await paidOrder()), after_weekday: 8 }),
      ).rejects.toMatchObject(rejected("order_correction_weekday_check"));
      await expect(
        insertCorrection({
          ...base(await paidOrder()),
          after_starts_at: "12:00",
          after_ends_at: "10:00",
        }),
      ).rejects.toMatchObject(rejected("order_correction_time_range_check"));
    });

    it("rejects a correction of an order that does not exist", async () => {
      await expect(
        insertCorrection(base("00000000-0000-4000-8000-0000000009ff")),
      ).rejects.toMatchObject({ code: "23503" });
    });
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
        AND tc.table_name IN (
          'enrollment_order', 'order_line', 'order_audit',
          'order_correction'
        )
      ORDER BY tc.table_name, ccu.table_name
    `);

    expect(rows).toEqual([
      { foreign_table_name: "student" },
      { foreign_table_name: "enrollment_order" },
      { foreign_table_name: "enrollment_order" },
      { foreign_table_name: "enrollment_order" },
    ]);
  });
});
