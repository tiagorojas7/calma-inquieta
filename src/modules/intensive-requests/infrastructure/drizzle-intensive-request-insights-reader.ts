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
          collected: string;
          settled: string;
          materials_cost: string;
        }>(sql`
          SELECT request.intensive_id,
                 count(*)::int AS confirmed_seats,
                 coalesce(sum(coalesce(request.paid_centavos, 0)
                   + coalesce(request.balance_centavos, 0)), 0) AS collected,
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
          collectedCentavos: Number(row.collected),
          settledCentavos: Number(row.settled),
          materialsCostCentavos: Number(row.materials_cost),
        }));
      } finally {
        await session.close();
      }
    },

    async unseenRequests() {
      const session = await openSession();
      try {
        // The workshop name comes from a LEFT JOIN written as SQL: the schema
        // ownership rule keeps this module out of the workshops schema file.
        const { rows } = await session.db.execute<{
          id: string;
          intensive_id: string;
          workshop_name: string | null;
          full_name: string;
          created_at: Date;
        }>(sql`
          SELECT request.id, request.intensive_id, workshop.name AS workshop_name,
                 request.full_name, request.created_at
          FROM ${requests} AS request
          LEFT JOIN intensive_workshop AS workshop
            ON workshop.id = request.intensive_id
          WHERE request.seen_at IS NULL AND request.status <> 'cancelled'
          ORDER BY request.created_at DESC, request.id ASC`);
        return rows.map((row) => ({
          id: row.id,
          intensiveId: row.intensive_id,
          workshopName: row.workshop_name,
          fullName: row.full_name,
          createdAt: new Date(row.created_at),
        }));
      } finally {
        await session.close();
      }
    },

    async pendingPayments() {
      const session = await openSession();
      try {
        // A pending request owes its deposit (the quoted one, or the
        // workshop's for a request made before projects existed). A confirmed
        // one owes the balance while its price is above its deposit and none is
        // recorded. Cancelled requests owe nothing. No due dates.
        const { rows } = await session.db.execute<{
          id: string;
          intensive_id: string;
          workshop_name: string | null;
          full_name: string;
          kind: "deposit" | "balance";
          amount: string;
          created_at: Date;
        }>(sql`
          SELECT request.id, request.intensive_id, workshop.name AS workshop_name,
                 request.full_name, request.created_at,
                 CASE WHEN request.status = 'pending_confirmation'
                      THEN 'deposit' ELSE 'balance' END AS kind,
                 CASE WHEN request.status = 'pending_confirmation'
                      THEN coalesce(request.deposit_centavos, workshop.deposit_centavos, 0)
                      ELSE request.price_centavos - request.deposit_centavos END AS amount
          FROM ${requests} AS request
          LEFT JOIN intensive_workshop AS workshop
            ON workshop.id = request.intensive_id
          WHERE request.status = 'pending_confirmation'
             OR (request.status = 'confirmed'
                 AND request.balance_centavos IS NULL
                 AND request.price_centavos IS NOT NULL
                 AND request.deposit_centavos IS NOT NULL
                 AND request.price_centavos > request.deposit_centavos)
          ORDER BY request.created_at ASC, request.id ASC`);
        return rows.map((row) => ({
          id: row.id,
          intensiveId: row.intensive_id,
          workshopName: row.workshop_name,
          fullName: row.full_name,
          kind: row.kind,
          amountCentavos: Number(row.amount),
          createdAt: new Date(row.created_at),
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
