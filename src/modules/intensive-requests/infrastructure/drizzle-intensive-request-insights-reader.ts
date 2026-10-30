import { count, eq, inArray, sql } from "drizzle-orm";
import { intensiveSeatRequest as requests } from "~/platform/db/schema/intensive-requests";
import type { DbSessionFactory } from "~/platform/db/session";
import type { IntensiveRequestInsightsReader } from "../application/intensive-request-insights-reader";

/** PostgreSQL aggregations of the seat requests, one session per call. */
export function createDrizzleIntensiveRequestInsightsReader(
  openSession: DbSessionFactory,
): IntensiveRequestInsightsReader {
  return {
    async registrations(intensiveIds) {
      if (intensiveIds.length === 0) return [];
      const session = await openSession();
      try {
        return await session.db
          .select({
            intensiveId: requests.intensiveId,
            confirmedSeats: count(),
            paidCentavos:
              sql`coalesce(sum(${requests.paidCentavos}), 0)`.mapWith(Number),
          })
          .from(requests)
          .where(
            sql`${requests.status} = 'confirmed' and ${inArray(requests.intensiveId, [...intensiveIds])}`,
          )
          .groupBy(requests.intensiveId);
      } finally {
        await session.close();
      }
    },

    async pendingRequests() {
      const session = await openSession();
      try {
        const [row] = await session.db
          .select({ total: count() })
          .from(requests)
          .where(eq(requests.status, "pending_confirmation"));
        return row?.total ?? 0;
      } finally {
        await session.close();
      }
    },
  };
}
