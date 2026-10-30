import { and, asc, gte, lt, notInArray } from "drizzle-orm";
import { intensiveWorkshop } from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import type { IntensiveInsightsReader } from "../application/insights-reader";

const NOT_HELD = ["draft", "cancelled"];

/** First day of the month after a `YYYY-MM` period, as `YYYY-MM-DD`. */
function nextMonthStart(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return month === 12
    ? `${String((year ?? 0) + 1)}-01-01`
    : `${String(year)}-${String((month ?? 0) + 1).padStart(2, "0")}-01`;
}

/** PostgreSQL reads of the intensivos for statistics, one session per call. */
export function createDrizzleIntensiveInsightsReader(
  openSession: DbSessionFactory,
): IntensiveInsightsReader {
  return {
    async intensives(period) {
      const session = await openSession();
      try {
        return await session.db
          .select({
            intensiveId: intensiveWorkshop.id,
            name: intensiveWorkshop.name,
            eventDate: intensiveWorkshop.eventDate,
            capacity: intensiveWorkshop.capacity,
            teacherId: intensiveWorkshop.teacherId,
            percentageBp: intensiveWorkshop.agreedPercentageBp,
          })
          .from(intensiveWorkshop)
          .where(
            and(
              gte(intensiveWorkshop.eventDate, `${period}-01`),
              lt(intensiveWorkshop.eventDate, nextMonthStart(period)),
              notInArray(intensiveWorkshop.status, NOT_HELD),
            ),
          )
          .orderBy(
            asc(intensiveWorkshop.eventDate),
            asc(intensiveWorkshop.name),
          );
      } finally {
        await session.close();
      }
    },
  };
}
