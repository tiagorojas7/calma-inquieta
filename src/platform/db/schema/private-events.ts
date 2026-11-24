import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const privateEventRequest = pgTable(
  "private_event_request",
  {
    id: uuid("id").primaryKey(),
    status: text("status").notNull(),
    fullName: text("full_name").notNull(),
    phoneDigits: text("phone_digits").notNull(),
    email: text("email"),
    // `YYYY-MM-DD` Córdoba calendar day, kept as text like the period keys.
    desiredDate: text("desired_date").notNull(),
    place: text("place").notNull(),
    participants: integer("participants").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    statusChangedBy: text("status_changed_by"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    /**
     * The panel's shared read state: set once, by the first owner who opens
     * the request (or by its creator when an admin makes it); both columns are
     * null or both set. Rows that predate the bell are backfilled as seen.
     */
    seenAt: timestamp("seen_at", { withTimezone: true }),
    seenBy: text("seen_by"),
  },
  (table) => [
    check(
      "private_event_request_seen_check",
      sql`(${table.seenAt} IS NULL) = (${table.seenBy} IS NULL)`,
    ),
    check(
      "private_event_request_status_check",
      sql`${table.status} IN ('nueva', 'contactada', 'cerrada')`,
    ),
    check(
      "private_event_request_participants_check",
      sql`${table.participants} BETWEEN 1 AND 200`,
    ),
    index("private_event_request_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);
