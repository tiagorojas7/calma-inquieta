import { and, asc, eq, ne } from "drizzle-orm";
import {
  monthlyWorkshop,
  periodTurno,
  workshopPeriod,
  workshopTurno,
} from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  InsightsPeriodStatus,
  PeriodCapacityRow,
  PeriodTeacherRow,
  WorkshopInsightsReader,
} from "../application/insights-reader";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/** PostgreSQL reads for statistics, one short-lived session per call. */
export function createDrizzleWorkshopInsightsReader(
  openSession: DbSessionFactory,
): WorkshopInsightsReader {
  async function withDb<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    capacity: (period) =>
      withDb(async (db) => {
        const rows = await db
          .select({
            workshopId: workshopPeriod.workshopId,
            workshopName: monthlyWorkshop.name,
            periodId: workshopPeriod.id,
            period: workshopPeriod.period,
            periodStatus: workshopPeriod.status,
            turnoId: periodTurno.turnoId,
            turnoLabel: workshopTurno.label,
            capacity: periodTurno.capacity,
          })
          .from(periodTurno)
          .innerJoin(
            workshopPeriod,
            eq(periodTurno.periodId, workshopPeriod.id),
          )
          .innerJoin(workshopTurno, eq(periodTurno.turnoId, workshopTurno.id))
          .innerJoin(
            monthlyWorkshop,
            eq(workshopPeriod.workshopId, monthlyWorkshop.id),
          )
          .where(
            and(
              eq(workshopPeriod.period, period),
              ne(workshopPeriod.status, "draft"),
            ),
          )
          .orderBy(
            asc(monthlyWorkshop.name),
            asc(workshopTurno.weekday),
            asc(workshopTurno.startsAt),
          );
        return rows.map((row): PeriodCapacityRow => ({
          ...row,
          periodStatus: row.periodStatus === "closed" ? "closed" : "open",
        }));
      }),

    periodTeachers: (period) =>
      withDb(async (db) => {
        const rows = await db
          .select({
            periodId: workshopPeriod.id,
            workshopId: workshopPeriod.workshopId,
            workshopName: monthlyWorkshop.name,
            teacherId: workshopPeriod.snapshotTeacherId,
            teacherName: workshopPeriod.snapshotTeacherName,
            modality: workshopPeriod.snapshotTeacherModality,
            percentageBp: workshopPeriod.snapshotPercentageBp,
          })
          .from(workshopPeriod)
          .innerJoin(
            monthlyWorkshop,
            eq(workshopPeriod.workshopId, monthlyWorkshop.id),
          )
          .where(eq(workshopPeriod.period, period))
          .orderBy(asc(monthlyWorkshop.name));
        return rows.map((row): PeriodTeacherRow => ({
          ...row,
          modality: row.modality === "own" ? "own" : "third_party",
        }));
      }),

    publishedWorkshops: (period) =>
      withDb(async (db) => {
        const rows = await db
          .select({
            workshopId: monthlyWorkshop.id,
            name: monthlyWorkshop.name,
            periodStatus: workshopPeriod.status,
          })
          .from(monthlyWorkshop)
          .leftJoin(
            workshopPeriod,
            and(
              eq(workshopPeriod.workshopId, monthlyWorkshop.id),
              eq(workshopPeriod.period, period),
            ),
          )
          .where(eq(monthlyWorkshop.status, "published"))
          .orderBy(asc(monthlyWorkshop.name));
        return rows.map((row) => ({
          ...row,
          periodStatus: row.periodStatus as InsightsPeriodStatus | null,
        }));
      }),
  };
}
