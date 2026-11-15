import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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

// The students registry is derived from `enrollment_order`; only the owner's
// observations are stored, keyed by the normalized email.
export const studentNote = pgTable(
  "student_note",
  {
    email: text("email").primaryKey(),
    note: text("note").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "student_note_email_check",
      sql`${table.email} = lower(btrim(${table.email})) AND ${table.email} <> ''`,
    ),
    check("student_note_length_check", sql`char_length(${table.note}) <= 2000`),
  ],
);
