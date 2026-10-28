import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A visitor's request for a seat in an intensivo. `intensive_id` is a plain
 * uuid, not a foreign key: the schema files stay independent of each other.
 * Only `confirmed` rows take a seat.
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
  },
  (table) => [
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
  ],
);
