import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import {
  enrollmentOrder as orders,
  orderLine,
  turnoSeatCounter,
} from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import type { EnrollmentInsightsReader } from "../application/insights-reader";
import type { OrderKind, OrderStatus } from "../domain/order-core";

const CONFIRMED = ["paid", "materials_requested", "materials_received"];

/** Enrollments, registrations and students count monthly records only, never a material sale. */
const ENROLLMENT = eq(orders.kind, "enrollment");

const sumOf = (expression: ReturnType<typeof sql>) =>
  sql`coalesce(sum(${expression}), 0)`.mapWith(Number);

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/** PostgreSQL aggregations over the orders, one short-lived session per call. */
export function createDrizzleEnrollmentInsightsReader(
  openSession: DbSessionFactory,
): EnrollmentInsightsReader {
  async function withDb<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }
  const inPeriod = (period: string | undefined) =>
    period === undefined ? undefined : eq(orders.period, period);

  return {
    ordersByStatus: ({ period }) =>
      withDb(async (db) => {
        const rows = await db
          .select({
            workshopId: orders.workshopId,
            workshopName: sql<string>`max(${orders.workshopName})`,
            turnoId: orders.turnoId,
            turnoLabel: sql<string>`max(${orders.turnoLabel})`,
            periodId: orders.periodId,
            period: orders.period,
            status: orders.status,
            orders: count(),
          })
          .from(orders)
          .where(and(ENROLLMENT, inPeriod(period)))
          .groupBy(
            orders.workshopId,
            orders.turnoId,
            orders.periodId,
            orders.period,
            orders.status,
          );
        return rows.map((row) => ({
          ...row,
          status: row.status as OrderStatus,
        }));
      }),

    confirmedSeats: (periodIds) =>
      periodIds.length === 0
        ? Promise.resolve([])
        : withDb((db) =>
            db
              .select({
                periodId: turnoSeatCounter.periodId,
                turnoId: turnoSeatCounter.turnoId,
                confirmedSeats: turnoSeatCounter.confirmedSeats,
              })
              .from(turnoSeatCounter)
              .where(inArray(turnoSeatCounter.periodId, [...periodIds])),
          ),

    income: ({ period, paidFrom, paidTo }) =>
      withDb((db) =>
        db
          .select({
            workshopId: orders.workshopId,
            workshopName: sql<string>`max(${orders.workshopName})`,
            period: orders.period,
            // A material sale adds its materials to the month, not a registration.
            orders:
              sql`count(*) filter (where ${orders.kind} = 'enrollment')`.mapWith(
                Number,
              ),
            feeCentavos: sumOf(sql`${orders.feeCentavos}`),
            materialsCentavos: sumOf(sql`${orders.materialsCentavos}`),
            // Each order's lines at their own cost, or at their price where none was loaded.
            materialsCostCentavos: sumOf(
              sql`(select coalesce(sum(${orderLine.quantity} * coalesce(${orderLine.unitCostCentavos}, ${orderLine.unitPriceCentavos})), 0) from ${orderLine} where ${orderLine.orderId} = ${orders.id})`,
            ),
          })
          .from(orders)
          .where(
            and(
              inArray(orders.status, CONFIRMED),
              inPeriod(period),
              paidFrom === undefined ? undefined : gte(orders.paidAt, paidFrom),
              paidTo === undefined ? undefined : lt(orders.paidAt, paidTo),
            ),
          )
          .groupBy(orders.workshopId, orders.period),
      ),

    periodRegistrations: (period) =>
      withDb(async (db) => {
        const rows = await db
          .select({
            periodId: orders.periodId,
            orders: count(),
            feeCentavos: sumOf(sql`${orders.feeCentavos}`),
            studentEmails: sql<
              string[]
            >`array_agg(distinct lower(btrim(${orders.studentEmail})))`,
          })
          .from(orders)
          .where(
            and(
              ENROLLMENT,
              inArray(orders.status, CONFIRMED),
              eq(orders.period, period),
            ),
          )
          .groupBy(orders.periodId);
        return rows;
      }),

    pendingSummary: (olderThan) =>
      withDb(async (db) => {
        const [row] = await db
          .select({
            total: count(),
            older:
              sql`count(*) filter (where ${orders.requestedAt} < ${olderThan.toISOString()}::timestamptz)`.mapWith(
                Number,
              ),
          })
          .from(orders)
          .where(eq(orders.status, "pending_confirmation"));
        return { total: row?.total ?? 0, older: row?.older ?? 0 };
      }),

    materials: ({ period }) =>
      withDb(async (db) => {
        const rows = await db
          .select({
            status: orders.status,
            workshopId: orders.workshopId,
            workshopName: sql<string>`max(${orders.workshopName})`,
            period: orders.period,
            supplierId: orderLine.supplierId,
            supplierName: sql<string>`max(${orderLine.supplierName})`,
            materialName: orderLine.materialName,
            orders: sql`count(distinct ${orders.id})`.mapWith(Number),
            units: sumOf(sql`${orderLine.quantity}`),
            amountCentavos: sumOf(
              sql`${orderLine.quantity} * ${orderLine.unitPriceCentavos}`,
            ),
            costCentavos: sumOf(
              sql`${orderLine.quantity} * coalesce(${orderLine.unitCostCentavos}, ${orderLine.unitPriceCentavos})`,
            ),
            uncostedLines:
              sql`count(*) filter (where ${orderLine.unitCostCentavos} is null)`.mapWith(
                Number,
              ),
          })
          .from(orderLine)
          .innerJoin(orders, eq(orderLine.orderId, orders.id))
          .where(and(ne(orders.status, "cancelled"), inPeriod(period)))
          .groupBy(
            orders.status,
            orders.workshopId,
            orders.period,
            orderLine.supplierId,
            orderLine.materialName,
          );
        return rows.map((row) => ({
          ...row,
          status: row.status as OrderStatus,
        }));
      }),

    unseenOrders: () =>
      withDb((db) =>
        db
          .select({
            id: orders.id,
            studentName: orders.studentName,
            workshopName: orders.workshopName,
            period: orders.period,
            requestedAt: orders.requestedAt,
          })
          .from(orders)
          .where(
            and(
              ENROLLMENT,
              ne(orders.status, "cancelled"),
              isNull(orders.seenAt),
            ),
          )
          .orderBy(desc(orders.requestedAt), asc(orders.id)),
      ),

    pendingPayments: () =>
      withDb(async (db) => {
        // Monthly fees and material sales alike; no due date, so a pending
        // order stays listed until it is paid or cancelled.
        const rows = await db
          .select({
            id: orders.id,
            kind: orders.kind,
            studentName: orders.studentName,
            workshopName: orders.workshopName,
            period: orders.period,
            totalCentavos: orders.totalCentavos,
            requestedAt: orders.requestedAt,
          })
          .from(orders)
          .where(eq(orders.status, "pending_confirmation"))
          .orderBy(asc(orders.requestedAt), asc(orders.id));
        return rows.map((row) => ({
          ...row,
          kind: row.kind as OrderKind,
        }));
      }),

    participation: (period) =>
      withDb(async (db) => {
        const email = sql`lower(btrim(${orders.studentEmail}))`;
        const result = await db.execute<{
          students: number;
          recurring: number;
        }>(sql`
          select count(*)::int as students,
                 (count(*) filter (where periods > 1))::int as recurring
          from (
            select ${email} as email, count(distinct ${orders.period}) as periods
            from ${orders}
            where ${ENROLLMENT} and ${inArray(orders.status, CONFIRMED)}
            group by ${email}
            having bool_or(${orders.period} = ${period})
          ) as confirmed
        `);
        const row = result.rows[0];
        return {
          students: row?.students ?? 0,
          recurring: row?.recurring ?? 0,
        };
      }),
  };
}
