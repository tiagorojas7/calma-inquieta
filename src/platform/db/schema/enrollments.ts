import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
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

/**
 * Durable student profile, created by the first completed enrollment and
 * matched afterwards by normalized email or phone. Owned by enrollments so
 * the profile and its order are written in one transaction.
 */
export const student = pgTable(
  "student",
  {
    id: uuid("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phoneDigits: text("phone_digits").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("student_email_unique").on(table.email),
    unique("student_phone_digits_unique").on(table.phoneDigits),
    check(
      "student_full_name_check",
      sql`${table.fullName} = btrim(${table.fullName}) AND ${table.fullName} <> ''`,
    ),
    check(
      "student_email_check",
      sql`${table.email} = lower(btrim(${table.email})) AND ${table.email} <> ''`,
    ),
    check(
      "student_phone_digits_check",
      sql`${table.phoneDigits} ~ '^[0-9]{10,15}$'`,
    ),
  ],
);

export const enrollmentOrder = pgTable(
  "enrollment_order",
  {
    id: uuid("id").primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id),
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
    // The refund of a cancelled paid order; the payment fields above stay as history.
    refundedAmountCentavos: bigint("refunded_amount_centavos", {
      mode: "number",
    }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundNote: text("refund_note"),
    refundedBy: text("refunded_by"),
    /**
     * `enrollment` is the monthly record; `material_sale` is a later material
     * purchase under that record's student and month (no fee, no seat, its
     * own payment state).
     */
    kind: text("kind").notNull().default("enrollment"),
    /** The monthly record a material sale belongs to; null for an enrollment. */
    parentOrderId: uuid("parent_order_id").references(
      (): AnyPgColumn => enrollmentOrder.id,
    ),
    /**
     * The panel's shared read state: set once, by the first owner who opens
     * the request (or by its creator when an admin makes it); both columns are
     * null or both set. Rows that predate the bell are backfilled as seen.
     */
    seenAt: timestamp("seen_at", { withTimezone: true }),
    seenBy: text("seen_by"),
    /**
     * The versions of the site-wide conditions and privacy documents the
     * student accepted; both are null or both set. Null for orders made before
     * the documents were versioned and for the ones an owner creates by hand.
     * No foreign key: the policies schema is independent.
     */
    conditionsVersion: integer("conditions_version"),
    privacyVersion: integer("privacy_version"),
  },
  (table) => [
    unique("enrollment_order_public_id_unique").on(table.publicId),
    unique("enrollment_order_number_unique").on(table.number),
    // One active monthly record per student and month; a cancelled one frees
    // it, and a material sale never counts toward it.
    uniqueIndex("enrollment_order_student_period_active_unique")
      .on(table.studentId, table.period)
      .where(
        sql`${table.status} <> 'cancelled' AND ${table.kind} = 'enrollment'`,
      ),
    check(
      "enrollment_order_acceptance_check",
      sql`(${table.conditionsVersion} IS NULL) = (${table.privacyVersion} IS NULL)`,
    ),
    check(
      "enrollment_order_seen_check",
      sql`(${table.seenAt} IS NULL) = (${table.seenBy} IS NULL)`,
    ),
    check(
      "enrollment_order_kind_check",
      sql`${table.kind} IN ('enrollment', 'material_sale')`,
    ),
    // A sale points at its monthly record, carries no fee and sells something.
    check(
      "enrollment_order_sale_check",
      sql`(${table.kind} = 'enrollment' AND ${table.parentOrderId} IS NULL)
          OR (${table.kind} = 'material_sale'
            AND ${table.parentOrderId} IS NOT NULL
            AND ${table.feeCentavos} = 0
            AND ${table.materialsCentavos} > 0)`,
    ),
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
    check("enrollment_order_fee_check", sql`${table.feeCentavos} >= 0`),
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
    check(
      "enrollment_order_refund_whole_pesos_check",
      sql`${table.refundedAmountCentavos} IS NULL OR ${table.refundedAmountCentavos} % 100 = 0`,
    ),
    check(
      "enrollment_order_refund_bounds_check",
      sql`${table.refundedAmountCentavos} IS NULL
          OR (${table.refundedAmountCentavos} >= 0
            AND ${table.paidAmountCentavos} IS NOT NULL
            AND ${table.refundedAmountCentavos} <= ${table.paidAmountCentavos})`,
    ),
    check(
      "enrollment_order_refund_state_check",
      sql`(${table.refundedAmountCentavos} IS NULL
            AND ${table.refundedAt} IS NULL
            AND ${table.refundedBy} IS NULL
            AND ${table.refundNote} IS NULL)
          OR (${table.status} = 'cancelled'
            AND ${table.paidAt} IS NOT NULL
            AND ${table.refundedAmountCentavos} IS NOT NULL
            AND ${table.refundedAt} IS NOT NULL
            AND ${table.refundedBy} IS NOT NULL)`,
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
    /**
     * Where the units come from: the studio's own stock or an order to the
     * supplier. Decided when the line is created and switched to `supplier`
     * when the stock ran out before the payment.
     */
    source: text("source").notNull().default("supplier"),
    /** The variant's supplier cost when the line was created; null when none was set. */
    unitCostCentavos: bigint("unit_cost_centavos", { mode: "number" }),
    /**
     * When this `stock` line's units left the on-hand count; null while they
     * have not. Taking skips a marked line and returning clears the mark, so
     * a line never takes or returns its units twice.
     */
    stockTakenAt: timestamp("stock_taken_at", { withTimezone: true }),
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
    check(
      "order_line_source_check",
      sql`${table.source} IN ('stock', 'supplier')`,
    ),
    check("order_line_unit_cost_check", sql`${table.unitCostCentavos} > 0`),
    check(
      "order_line_stock_taken_check",
      sql`${table.stockTakenAt} IS NULL OR ${table.source} = 'stock'`,
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

const ACTIVE_STATUSES = sql`('pending_confirmation', 'paid', 'materials_requested', 'materials_received')`;

/**
 * One correction of an active order (workshop, month, turno or fee), with the
 * order as it stood before and after. Append-only history: a raised total keeps
 * the payment it sent back to pending here, a lowered one keeps the difference
 * the owner gave back.
 */
export const orderCorrection = pgTable(
  "order_correction",
  {
    id: uuid("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => enrollmentOrder.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull(),
    actor: text("actor").notNull(),
    note: text("note"),
    beforeWorkshopId: uuid("before_workshop_id").notNull(),
    beforeWorkshopName: text("before_workshop_name").notNull(),
    beforePeriodId: uuid("before_period_id").notNull(),
    beforePeriod: text("before_period").notNull(),
    beforeTurnoId: uuid("before_turno_id").notNull(),
    beforeTurnoLabel: text("before_turno_label").notNull(),
    beforeWeekday: integer("before_weekday").notNull(),
    beforeStartsAt: time("before_starts_at").notNull(),
    beforeEndsAt: time("before_ends_at").notNull(),
    beforeFeeCentavos: bigint("before_fee_centavos", {
      mode: "number",
    }).notNull(),
    beforeTotalCentavos: bigint("before_total_centavos", {
      mode: "number",
    }).notNull(),
    beforeStatus: text("before_status").notNull(),
    afterWorkshopId: uuid("after_workshop_id").notNull(),
    afterWorkshopName: text("after_workshop_name").notNull(),
    afterPeriodId: uuid("after_period_id").notNull(),
    afterPeriod: text("after_period").notNull(),
    afterTurnoId: uuid("after_turno_id").notNull(),
    afterTurnoLabel: text("after_turno_label").notNull(),
    afterWeekday: integer("after_weekday").notNull(),
    afterStartsAt: time("after_starts_at").notNull(),
    afterEndsAt: time("after_ends_at").notNull(),
    afterFeeCentavos: bigint("after_fee_centavos", {
      mode: "number",
    }).notNull(),
    afterTotalCentavos: bigint("after_total_centavos", {
      mode: "number",
    }).notNull(),
    afterStatus: text("after_status").notNull(),
    // The payment a raised total sent back to pending.
    previousPaidAmountCentavos: bigint("previous_paid_amount_centavos", {
      mode: "number",
    }),
    previousPaidAt: timestamp("previous_paid_at", { withTimezone: true }),
    previousConfirmedBy: text("previous_confirmed_by"),
    // What the owner gave back when a paid order's total dropped.
    refundedAmountCentavos: bigint("refunded_amount_centavos", {
      mode: "number",
    }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundNote: text("refund_note"),
  },
  (table) => [
    check(
      "order_correction_status_check",
      sql`${table.beforeStatus} IN ${ACTIVE_STATUSES} AND ${table.afterStatus} IN ${ACTIVE_STATUSES}`,
    ),
    check(
      "order_correction_weekday_check",
      sql`${table.beforeWeekday} BETWEEN 1 AND 7 AND ${table.afterWeekday} BETWEEN 1 AND 7`,
    ),
    check(
      "order_correction_time_range_check",
      sql`${table.beforeEndsAt} > ${table.beforeStartsAt} AND ${table.afterEndsAt} > ${table.afterStartsAt}`,
    ),
    check(
      "order_correction_amounts_check",
      sql`${table.beforeFeeCentavos} >= 0
          AND ${table.afterFeeCentavos} >= 0
          AND ${table.beforeTotalCentavos} >= ${table.beforeFeeCentavos}
          AND ${table.afterTotalCentavos} >= ${table.afterFeeCentavos}
          AND ${table.beforeFeeCentavos} % 100 = 0
          AND ${table.afterFeeCentavos} % 100 = 0
          AND ${table.beforeTotalCentavos} % 100 = 0
          AND ${table.afterTotalCentavos} % 100 = 0
          AND ${table.afterTotalCentavos} - ${table.afterFeeCentavos} = ${table.beforeTotalCentavos} - ${table.beforeFeeCentavos}`,
    ),
    // A pending order stays pending; a paid one returns to pending only when
    // its total rose, and otherwise keeps its paid state.
    check(
      "order_correction_outcome_check",
      sql`(${table.beforeStatus} = 'pending_confirmation'
            AND ${table.afterStatus} = 'pending_confirmation')
          OR (${table.beforeStatus} <> 'pending_confirmation'
            AND ${table.afterTotalCentavos} > ${table.beforeTotalCentavos}
            AND ${table.afterStatus} = 'pending_confirmation')
          OR (${table.beforeStatus} <> 'pending_confirmation'
            AND ${table.afterTotalCentavos} <= ${table.beforeTotalCentavos}
            AND ${table.afterStatus} = ${table.beforeStatus})`,
    ),
    // The previous payment is kept exactly when the order went back to pending.
    check(
      "order_correction_previous_payment_check",
      sql`(${table.previousPaidAmountCentavos} IS NULL
            AND ${table.previousPaidAt} IS NULL
            AND ${table.previousConfirmedBy} IS NULL
            AND NOT (${table.beforeStatus} <> 'pending_confirmation'
              AND ${table.afterStatus} = 'pending_confirmation'))
          OR (${table.previousPaidAmountCentavos} = ${table.beforeTotalCentavos}
            AND ${table.previousPaidAt} IS NOT NULL
            AND ${table.beforeStatus} <> 'pending_confirmation'
            AND ${table.afterStatus} = 'pending_confirmation')`,
    ),
    // The refunded difference is recorded exactly when a paid order's total dropped.
    check(
      "order_correction_refund_check",
      sql`(${table.refundedAmountCentavos} IS NULL
            AND ${table.refundedAt} IS NULL
            AND ${table.refundNote} IS NULL
            AND NOT (${table.beforeStatus} <> 'pending_confirmation'
              AND ${table.afterTotalCentavos} < ${table.beforeTotalCentavos}))
          OR (${table.refundedAmountCentavos} IS NOT NULL
            AND ${table.refundedAt} IS NOT NULL
            AND ${table.beforeStatus} <> 'pending_confirmation'
            AND ${table.afterTotalCentavos} < ${table.beforeTotalCentavos}
            AND ${table.refundedAmountCentavos} >= 0
            AND ${table.refundedAmountCentavos} % 100 = 0
            AND ${table.refundedAmountCentavos} <= ${table.beforeTotalCentavos} - ${table.afterTotalCentavos})`,
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
