import { count, eq, sql } from "drizzle-orm";
import {
  intensiveRequestMaterial,
  intensiveSeatRequest as requests,
} from "~/platform/db/schema/intensive-requests";
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
        // A request is paid in full once its balance is recorded, or when the
        // deposit was the whole price. Cancelled requests never reach this
        // query, so a cancellation or refund drops out of the settlement. The
        // materials cost is each line's own frozen unit cost, never today's.
        const { rows } = await session.db.execute<{
          intensive_id: string;
          confirmed_seats: number;
          settled: string;
          materials_cost: string;
        }>(sql`
          SELECT request.intensive_id,
                 count(*)::int AS confirmed_seats,
                 coalesce(sum(CASE WHEN paid.in_full
                   THEN request.paid_centavos + coalesce(request.balance_centavos, 0)
                   ELSE 0 END), 0) AS settled,
                 coalesce(sum(CASE WHEN paid.in_full
                   THEN allocated.cost ELSE 0 END), 0) AS materials_cost
          FROM ${requests} AS request
          CROSS JOIN LATERAL (
            SELECT (request.balance_centavos IS NOT NULL
                    OR (request.price_centavos IS NOT NULL
                        AND request.deposit_centavos = request.price_centavos)) AS in_full
          ) AS paid
          LEFT JOIN LATERAL (
            SELECT sum(line.quantity * line.unit_cost_centavos) AS cost
            FROM ${intensiveRequestMaterial} AS line
            WHERE line.request_id = request.id
          ) AS allocated ON true
          WHERE request.status = 'confirmed'
            AND request.intensive_id IN (${sql.join(
              intensiveIds.map((id) => sql`${id}`),
              sql`, `,
            )})
          GROUP BY request.intensive_id`);
        return rows.map((row) => ({
          intensiveId: row.intensive_id,
          confirmedSeats: row.confirmed_seats,
          settledCentavos: Number(row.settled),
          materialsCostCentavos: Number(row.materials_cost),
        }));
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
