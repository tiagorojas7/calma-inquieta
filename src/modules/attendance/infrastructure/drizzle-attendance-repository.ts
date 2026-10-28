import { and, asc, eq } from "drizzle-orm";
import { err, ok } from "~/modules/_shared";
import {
  attendanceMakeUp,
  attendanceMark,
} from "~/platform/db/schema/attendance";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  AttendanceRepository,
  StoredMakeUp,
  StoredMark,
} from "../application/attendance-ports";
import { isAttendanceStatus, isMakeUpStatus } from "../domain/attendance-core";

type MarkRow = typeof attendanceMark.$inferSelect;
type MakeUpRow = typeof attendanceMakeUp.$inferSelect;

function toMark(row: MarkRow): StoredMark {
  if (!isAttendanceStatus(row.status))
    throw new Error(`Unknown attendance status: ${row.status}`);
  return {
    periodId: row.periodId,
    turnoId: row.turnoId,
    date: row.sessionDate,
    email: row.studentEmail,
    status: row.status,
    markedBy: row.markedBy,
    markedAt: row.markedAt,
  };
}

function toMakeUp(row: MakeUpRow): StoredMakeUp {
  if (!isMakeUpStatus(row.status))
    throw new Error(`Unknown make-up status: ${row.status}`);
  return {
    id: row.id,
    email: row.studentEmail,
    studentName: row.studentName,
    periodId: row.periodId,
    turnoId: row.turnoId,
    date: row.sessionDate,
    makeUpPeriodId: row.makeUpPeriodId,
    makeUpTurnoId: row.makeUpTurnoId,
    makeUpDate: row.makeUpDate,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    doneBy: row.doneBy,
    doneAt: row.doneAt,
  };
}

const markOrder = [
  asc(attendanceMark.sessionDate),
  asc(attendanceMark.studentEmail),
  asc(attendanceMark.turnoId),
] as const;
const makeUpOrder = [
  asc(attendanceMakeUp.makeUpDate),
  asc(attendanceMakeUp.id),
] as const;

/** One short-lived session per call; database errors propagate to the caller. */
export function createDrizzleAttendanceRepository(
  openSession: DbSessionFactory,
): AttendanceRepository {
  async function withSession<T>(
    run: (db: Awaited<ReturnType<DbSessionFactory>>["db"]) => Promise<T>,
  ): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    replaceSession: (session, marks) =>
      withSession((db) =>
        db.transaction(async (tx) => {
          await tx
            .delete(attendanceMark)
            .where(
              and(
                eq(attendanceMark.periodId, session.periodId),
                eq(attendanceMark.turnoId, session.turnoId),
                eq(attendanceMark.sessionDate, session.date),
              ),
            );
          if (marks.length === 0) return;
          await tx.insert(attendanceMark).values(
            marks.map((mark) => ({
              periodId: mark.periodId,
              turnoId: mark.turnoId,
              sessionDate: mark.date,
              studentEmail: mark.email,
              status: mark.status,
              markedBy: mark.markedBy,
              markedAt: mark.markedAt,
            })),
          );
        }),
      ),

    marksForTurno: (periodId, turnoId) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(attendanceMark)
          .where(
            and(
              eq(attendanceMark.periodId, periodId),
              eq(attendanceMark.turnoId, turnoId),
            ),
          )
          .orderBy(...markOrder);
        return rows.map(toMark);
      }),

    marksByStudent: (email) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(attendanceMark)
          .where(eq(attendanceMark.studentEmail, email))
          .orderBy(...markOrder);
        return rows.map(toMark);
      }),

    insertMakeUp: (value) =>
      withSession(async (db) => {
        const inserted = await db
          .insert(attendanceMakeUp)
          .values({
            id: value.id,
            studentEmail: value.email,
            studentName: value.studentName,
            periodId: value.periodId,
            turnoId: value.turnoId,
            sessionDate: value.date,
            makeUpPeriodId: value.makeUpPeriodId,
            makeUpTurnoId: value.makeUpTurnoId,
            makeUpDate: value.makeUpDate,
            status: value.status,
            createdBy: value.createdBy,
            createdAt: value.createdAt,
            doneBy: value.doneBy,
            doneAt: value.doneAt,
          })
          .onConflictDoNothing({
            target: [
              attendanceMakeUp.studentEmail,
              attendanceMakeUp.periodId,
              attendanceMakeUp.turnoId,
              attendanceMakeUp.sessionDate,
            ],
          })
          .returning({ id: attendanceMakeUp.id });
        return inserted.length > 0
          ? ok(undefined)
          : err({ kind: "make-up-exists" as const });
      }),

    listMakeUps: (status) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(attendanceMakeUp)
          .where(
            status === "all" ? undefined : eq(attendanceMakeUp.status, status),
          )
          .orderBy(...makeUpOrder);
        return rows.map(toMakeUp);
      }),

    makeUpsByStudent: (email) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(attendanceMakeUp)
          .where(eq(attendanceMakeUp.studentEmail, email))
          .orderBy(...makeUpOrder);
        return rows.map(toMakeUp);
      }),

    makeUpsForTurno: (periodId, turnoId) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(attendanceMakeUp)
          .where(
            and(
              eq(attendanceMakeUp.periodId, periodId),
              eq(attendanceMakeUp.turnoId, turnoId),
            ),
          )
          .orderBy(...makeUpOrder);
        return rows.map(toMakeUp);
      }),

    completeMakeUp: (id, change) =>
      withSession(async (db) => {
        await db
          .update(attendanceMakeUp)
          .set({ status: "done", doneBy: change.by, doneAt: change.at })
          .where(
            and(
              eq(attendanceMakeUp.id, id),
              eq(attendanceMakeUp.status, "pending"),
            ),
          );
        const [row] = await db
          .select()
          .from(attendanceMakeUp)
          .where(eq(attendanceMakeUp.id, id));
        return row ? toMakeUp(row) : null;
      }),
  };
}
