import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  integer,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const enrollmentOrder = pgTable(
  "enrollment_order",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull(),
    number: text("number").notNull(),
    status: text("status").notNull(),
    source: text("source").notNull(),
    workshopId: uuid("workshop_id").notNull(),
    periodId: uuid("period_id").notNull(),
    period: text("period").notNull(),
    turnoId: uuid("turno_id").notNull(),
    workshopName: text("workshop_name").notNull(),
    turnoLabel: text("turno_label").notNull(),
    weekday: integer("weekday").notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    studentName: text("student_name").notNull(),
    studentEmail: text("student_email").notNull(),
    studentPhoneDigits: text("student_phone_digits").notNull(),
    feeCentavos: bigint("fee_centavos", { mode: "number" }).notNull(),
    materialsCentavos: bigint("materials_centavos", {
      mode: "number",
    }).notNull(),
    totalCentavos: bigint("total_centavos", { mode: "number" }).notNull(),
    policyVersion: text("policy_version").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidAmountCentavos: bigint("paid_amount_centavos", { mode: "number" }),
    paymentNote: text("payment_note"),
    confirmedBy: text("confirmed_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    cancelledBy: text("cancelled_by"),
  },
  (table) => [
    unique("enrollment_order_public_id_unique").on(table.publicId),
    unique("enrollment_order_number_unique").on(table.number),
    uniqueIndex("enrollment_order_active_duplicate_unique")
      .on(table.studentEmail, table.workshopId, table.periodId)
      .where(sql`${table.status} <> 'cancelled'`),
    check(
      "enrollment_order_status_check",
      sql`${table.status} IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received', 'cancelled')`,
    ),
    check("enrollment_order_source_check", sql`${table.source} = 'public'`),
    check(
      "enrollment_order_period_check",
      sql`${table.period} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    check(
      "enrollment_order_weekday_check",
      sql`${table.weekday} BETWEEN 1 AND 7`,
    ),
    check(
      "enrollment_order_time_range_check",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check("enrollment_order_fee_check", sql`${table.feeCentavos} > 0`),
    check(
      "enrollment_order_materials_check",
      sql`${table.materialsCentavos} >= 0`,
    ),
    check(
      "enrollment_order_total_check",
      sql`${table.totalCentavos} = ${table.feeCentavos} + ${table.materialsCentavos}`,
    ),
    check(
      "enrollment_order_whole_pesos_check",
      sql`${table.feeCentavos} % 100 = 0
          AND ${table.materialsCentavos} % 100 = 0
          AND ${table.totalCentavos} % 100 = 0
          AND (${table.paidAmountCentavos} IS NULL OR ${table.paidAmountCentavos} % 100 = 0)`,
    ),
    check(
      "enrollment_order_paid_amount_check",
      sql`${table.paidAmountCentavos} IS NULL OR ${table.paidAmountCentavos} = ${table.totalCentavos}`,
    ),
    check(
      "enrollment_order_paid_state_check",
      sql`(${table.status} = 'pending_confirmation'
            AND ${table.paidAt} IS NULL
            AND ${table.paidAmountCentavos} IS NULL)
          OR (${table.status} IN ('paid', 'materials_requested', 'materials_received')
            AND ${table.paidAt} IS NOT NULL
            AND ${table.paidAmountCentavos} IS NOT NULL)
          OR (${table.status} = 'cancelled'
            AND (${table.paidAt} IS NULL) = (${table.paidAmountCentavos} IS NULL))`,
    ),
  ],
);

export const orderLine = pgTable(
  "order_line",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => enrollmentOrder.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    materialId: uuid("material_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    materialName: text("material_name").notNull(),
    variantLabel: text("variant_label").notNull(),
    unitPriceCentavos: bigint("unit_price_centavos", {
      mode: "number",
    }).notNull(),
    quantity: integer("quantity").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    supplierName: text("supplier_name").notNull(),
  },
  (table) => [
    primaryKey({
      name: "order_line_pkey",
      columns: [table.orderId, table.position],
    }),
    check("order_line_position_check", sql`${table.position} >= 0`),
    check("order_line_quantity_check", sql`${table.quantity} BETWEEN 1 AND 20`),
    check(
      "order_line_unit_price_check",
      sql`${table.unitPriceCentavos} > 0 AND ${table.unitPriceCentavos} % 100 = 0`,
    ),
  ],
);

export const orderAudit = pgTable(
  "order_audit",
  {
    id: uuid("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => enrollmentOrder.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull(),
    actor: text("actor").notNull(),
    from: text("from"),
    to: text("to").notNull(),
    note: text("note"),
  },
  (table) => [
    check(
      "order_audit_from_check",
      sql`${table.from} IS NULL OR ${table.from} IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received', 'cancelled')`,
    ),
    check(
      "order_audit_to_check",
      sql`${table.to} IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received', 'cancelled')`,
    ),
  ],
);

export const turnoSeatCounter = pgTable(
  "turno_seat_counter",
  {
    periodId: uuid("period_id").notNull(),
    turnoId: uuid("turno_id").notNull(),
    confirmedSeats: integer("confirmed_seats").notNull().default(0),
    capacity: integer("capacity").notNull(),
  },
  (table) => [
    primaryKey({
      name: "turno_seat_counter_pkey",
      columns: [table.periodId, table.turnoId],
    }),
    check(
      "turno_seat_counter_confirmed_seats_check",
      sql`${table.confirmedSeats} >= 0 AND ${table.confirmedSeats} <= ${table.capacity}`,
    ),
    check("turno_seat_counter_capacity_check", sql`${table.capacity} > 0`),
  ],
);

export const orderNumberSequence = pgTable(
  "order_number_sequence",
  {
    year: integer("year").primaryKey(),
    last: integer("last").notNull().default(0),
  },
  (table) => [
    check("order_number_sequence_year_check", sql`${table.year} >= 2000`),
    check("order_number_sequence_last_check", sql`${table.last} >= 0`),
  ],
);
