import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A visitor's request for a seat in an intensivo. `intensive_id` is a plain
 * uuid, not a foreign key: the schema files stay independent of each other,
 * and so is `project_id`. Only `confirmed` rows take a seat.
 */
export const intensiveSeatRequest = pgTable(
  "intensive_seat_request",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull(),
    intensiveId: uuid("intensive_id").notNull(),
    status: text("status").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phoneDigits: text("phone_digits").notNull(),
    policyAcceptedAt: timestamp("policy_accepted_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    paidCentavos: integer("paid_centavos"),
    // `YYYY-MM-DD` Córdoba calendar day, kept as text like the period keys.
    paidOn: text("paid_on"),
    paymentNote: text("payment_note"),
    confirmedBy: text("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    cancelledBy: text("cancelled_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /** The chosen project; null on requests made before projects existed. */
    projectId: uuid("project_id"),
    /** The project's price and deposit when the request was made. */
    priceCentavos: bigint("price_centavos", { mode: "number" }),
    depositCentavos: bigint("deposit_centavos", { mode: "number" }),
    /** The one full balance payment, recorded after the deposit. */
    balanceCentavos: bigint("balance_centavos", { mode: "number" }),
    // `YYYY-MM-DD` Córdoba calendar day, like `paid_on`.
    balancePaidOn: text("balance_paid_on"),
    balanceNote: text("balance_note"),
    balanceBy: text("balance_by"),
    balanceAt: timestamp("balance_at", { withTimezone: true }),
    /**
     * What a cancellation gave back (zero allowed), kept next to the payments
     * that stay as history. Who and when come from `cancelled_by/at`.
     */
    refundCentavos: bigint("refund_centavos", { mode: "number" }),
    // `YYYY-MM-DD` Córdoba calendar day, like `paid_on`.
    refundedOn: text("refunded_on"),
    refundNote: text("refund_note"),
    /**
     * The panel's shared read state: set once, by the first owner who opens
     * the request (or by its creator when an admin makes it); both columns are
     * null or both set. Rows that predate the bell are backfilled as seen.
     */
    seenAt: timestamp("seen_at", { withTimezone: true }),
    seenBy: text("seen_by"),
    /**
     * The versions of the site-wide conditions and privacy documents the
     * person accepted; both are null or both set (null for requests made
     * before the documents were versioned). `policy_accepted_at` stays the
     * moment of acceptance. No foreign key: the policies schema is independent.
     */
    conditionsVersion: integer("conditions_version"),
    privacyVersion: integer("privacy_version"),
  },
  (table) => [
    check(
      "intensive_seat_request_acceptance_check",
      sql`(${table.conditionsVersion} IS NULL) = (${table.privacyVersion} IS NULL)`,
    ),
    check(
      "intensive_seat_request_seen_check",
      sql`(${table.seenAt} IS NULL) = (${table.seenBy} IS NULL)`,
    ),
    uniqueIndex("intensive_seat_request_public_id_unique").on(table.publicId),
    // One live request per person and intensivo; a cancelled one is released.
    uniqueIndex("intensive_seat_request_live_email_unique")
      .on(table.intensiveId, table.email)
      .where(sql`${table.status} <> 'cancelled'`),
    index("intensive_seat_request_intensive_status_idx").on(
      table.intensiveId,
      table.status,
    ),
    check(
      "intensive_seat_request_status_check",
      sql`${table.status} IN ('pending_confirmation', 'confirmed', 'cancelled')`,
    ),
    check(
      "intensive_seat_request_confirmed_check",
      sql`${table.status} <> 'confirmed' OR (${table.paidCentavos} > 0 AND ${table.paidOn} IS NOT NULL)`,
    ),
    // Price and deposit are snapshotted together, in whole pesos.
    check(
      "intensive_seat_request_snapshot_check",
      sql`(${table.priceCentavos} IS NULL AND ${table.depositCentavos} IS NULL)
          OR (${table.priceCentavos} IS NOT NULL AND ${table.depositCentavos} IS NOT NULL
              AND ${table.priceCentavos} > 0 AND ${table.depositCentavos} > 0
              AND ${table.depositCentavos} <= ${table.priceCentavos}
              AND ${table.priceCentavos} % 100 = 0
              AND ${table.depositCentavos} % 100 = 0)`,
    ),
    // The balance is recorded all or nothing and for exactly what the deposit
    // left unpaid (any positive amount while the snapshot is missing).
    check(
      "intensive_seat_request_balance_complete_check",
      sql`(${table.balanceCentavos} IS NULL AND ${table.balancePaidOn} IS NULL
            AND ${table.balanceBy} IS NULL AND ${table.balanceAt} IS NULL
            AND ${table.balanceNote} IS NULL)
          OR (${table.balanceCentavos} IS NOT NULL AND ${table.balancePaidOn} IS NOT NULL
              AND ${table.balanceBy} IS NOT NULL AND ${table.balanceAt} IS NOT NULL)`,
    ),
    // A cancelled request keeps the balance it paid, as history next to its
    // refund. Every term is explicit: a CHECK that evaluates to NULL passes.
    check(
      "intensive_seat_request_balance_status_check",
      sql`${table.balanceCentavos} IS NULL
          OR (${table.status} IN ('confirmed', 'cancelled') AND ${table.paidCentavos} IS NOT NULL)`,
    ),
    check(
      "intensive_seat_request_balance_amount_check",
      sql`${table.balanceCentavos} IS NULL
          OR (${table.balanceCentavos} > 0
              AND (${table.priceCentavos} IS NULL
                   OR ${table.balanceCentavos} = ${table.priceCentavos} - ${table.depositCentavos}))`,
    ),
    // The refund is recorded all or nothing, only on a cancelled request, in
    // whole pesos and never above what was paid (deposit plus balance).
    check(
      "intensive_seat_request_refund_complete_check",
      sql`(${table.refundCentavos} IS NULL AND ${table.refundedOn} IS NULL
            AND ${table.refundNote} IS NULL)
          OR (${table.refundCentavos} IS NOT NULL AND ${table.refundedOn} IS NOT NULL)`,
    ),
    check(
      "intensive_seat_request_refund_status_check",
      sql`${table.refundCentavos} IS NULL OR ${table.status} = 'cancelled'`,
    ),
    check(
      "intensive_seat_request_refund_amount_check",
      sql`${table.refundCentavos} IS NULL
          OR (${table.refundCentavos} >= 0 AND ${table.refundCentavos} % 100 = 0
              AND ${table.paidCentavos} IS NOT NULL
              AND ${table.refundCentavos} <= ${table.paidCentavos} + COALESCE(${table.balanceCentavos}, 0))`,
    ),
  ],
);

/**
 * The materials a request took from its project when the deposit was
 * confirmed, with the names, supplier and cost frozen at that moment. It has
 * no foreign keys to the catalog: later edits never rewrite it (a catalog
 * save deletes and re-inserts variants, like `order_line`). `source` says
 * whether the units came from the studio's stock or wait on a supplier order.
 */
export const intensiveRequestMaterial = pgTable(
  "intensive_request_material",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => intensiveSeatRequest.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    variantId: uuid("variant_id").notNull(),
    materialName: text("material_name").notNull(),
    variantLabel: text("variant_label").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    supplierName: text("supplier_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitCostCentavos: bigint("unit_cost_centavos", { mode: "number" }),
    source: text("source").notNull(),
    // Set when the line joins a supplier purchase.
    requestedAt: timestamp("requested_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      name: "intensive_request_material_pkey",
      columns: [table.requestId, table.position],
    }),
    check(
      "intensive_request_material_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "intensive_request_material_quantity_check",
      sql`${table.quantity} BETWEEN 1 AND 20`,
    ),
    check(
      "intensive_request_material_unit_cost_check",
      sql`${table.unitCostCentavos} > 0`,
    ),
    check(
      "intensive_request_material_source_check",
      sql`${table.source} IN ('stock', 'supplier')`,
    ),
  ],
);
