import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  OrderAudienceReader,
  OrderAudienceRow,
} from "../application/order-audience";

type Row = typeof enrollmentOrder.$inferSelect;

/** Statuses of a student whose seat is confirmed. */
const ATTENDING = ["paid", "materials_requested", "materials_received"];

function toRow(row: Row): OrderAudienceRow {
  const total = Money.fromCentavos(row.totalCentavos);
  if (!total.ok) throw new Error("persisted order total is invalid");
  return {
    number: row.number,
    publicId: row.publicId,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    workshopName: row.workshopName,
    period: row.period,
    turnoLabel: row.turnoLabel,
    startsAt: row.startsAt,
    total: total.value,
  };
}

/** Reads the audiences of the scheduled notifications. */
export function createDrizzleOrderAudienceReader(
  openSession: DbSessionFactory,
): OrderAudienceReader {
  async function read(
    where: ReturnType<typeof and>,
  ): Promise<readonly OrderAudienceRow[]> {
    const session = await openSession();
    try {
      const rows = await session.db
        .select()
        .from(enrollmentOrder)
        .where(where)
        .orderBy(enrollmentOrder.number);
      return rows.map(toRow);
    } finally {
      await session.close();
    }
  }
  return {
    classesOn: (weekday, period) =>
      read(
        and(
          inArray(enrollmentOrder.status, ATTENDING),
          eq(enrollmentOrder.weekday, weekday),
          eq(enrollmentOrder.period, period),
        ),
      ),
    pendingRequestedBetween: (from, to) =>
      read(
        and(
          eq(enrollmentOrder.status, "pending_confirmation"),
          gte(enrollmentOrder.requestedAt, from),
          lt(enrollmentOrder.requestedAt, to),
        ),
      ),
  };
}
