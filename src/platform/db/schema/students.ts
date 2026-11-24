import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// The durable student profile lives with the enrollments that create it
// (`student` in ./enrollments); this module stores only the owner's
// observations, keyed by the normalized email.
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
