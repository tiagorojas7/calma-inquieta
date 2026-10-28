import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Class sessions are generated (a turno's weekday inside the period's month),
// so only what the owner records is stored. Period and turno ids are plain
// uuids, not foreign keys: the schema files stay independent of each other.

/** One student's mark for one class session. */
export const attendanceMark = pgTable(
  "attendance_mark",
  {
    periodId: uuid("period_id").notNull(),
    turnoId: uuid("turno_id").notNull(),
    sessionDate: date("session_date", { mode: "string" }).notNull(),
    studentEmail: text("student_email").notNull(),
    status: text("status").notNull(),
    markedBy: text("marked_by").notNull(),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "attendance_mark_pkey",
      columns: [
        table.periodId,
        table.turnoId,
        table.sessionDate,
        table.studentEmail,
      ],
    }),
    index("attendance_mark_student_idx").on(table.studentEmail),
    check(
      "attendance_mark_status_check",
      sql`${table.status} IN ('present', 'absent')`,
    ),
    check(
      "attendance_mark_email_check",
      sql`${table.studentEmail} = lower(btrim(${table.studentEmail})) AND ${table.studentEmail} <> ''`,
    ),
  ],
);

/** A class an absent student recovers on another date and turno. */
export const attendanceMakeUp = pgTable(
  "attendance_make_up",
  {
    id: uuid("id").primaryKey(),
    studentEmail: text("student_email").notNull(),
    studentName: text("student_name").notNull(),
    periodId: uuid("period_id").notNull(),
    turnoId: uuid("turno_id").notNull(),
    sessionDate: date("session_date", { mode: "string" }).notNull(),
    makeUpPeriodId: uuid("make_up_period_id").notNull(),
    makeUpTurnoId: uuid("make_up_turno_id").notNull(),
    makeUpDate: date("make_up_date", { mode: "string" }).notNull(),
    status: text("status").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    doneBy: text("done_by"),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (table) => [
    // One make-up per student and absent session.
    uniqueIndex("attendance_make_up_absence_unique").on(
      table.studentEmail,
      table.periodId,
      table.turnoId,
      table.sessionDate,
    ),
    index("attendance_make_up_status_idx").on(table.status, table.makeUpDate),
    check(
      "attendance_make_up_status_check",
      sql`${table.status} IN ('pending', 'done')`,
    ),
    check(
      "attendance_make_up_done_check",
      sql`(${table.status} = 'done') = (${table.doneAt} IS NOT NULL AND ${table.doneBy} IS NOT NULL)`,
    ),
    check(
      "attendance_make_up_email_check",
      sql`${table.studentEmail} = lower(btrim(${table.studentEmail})) AND ${table.studentEmail} <> ''`,
    ),
  ],
);
