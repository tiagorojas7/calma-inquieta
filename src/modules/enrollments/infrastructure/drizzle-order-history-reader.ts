import { eq, sql } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  OrderHistoryReader,
  OrderHistoryRow,
} from "../application/order-history";
import type { OrderStatus } from "../domain/order-core";

type Row = typeof enrollmentOrder.$inferSelect;

function toSource(row: Row): OrderHistoryRow {
  const total = Money.fromCentavos(row.totalCentavos);
  if (!total.ok) throw new Error("persisted order total is invalid");
  return {
    id: row.id,
    number: row.number,
    status: row.status as OrderStatus,
    requestedAt: row.requestedAt,
    paidAt: row.paidAt,
    total: total.value,
    workshopId: row.workshopId,
    workshopName: row.workshopName,
    period: row.period,
    turnoLabel: row.turnoLabel,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    studentPhoneDigits: row.studentPhoneDigits,
  };
}

/**
 * Reads the order history other modules derive from (the students registry).
 * Grouping stays with the consumer; the studio handles hundreds of orders a
 * year, which one request can load.
 */
export function createDrizzleOrderHistoryReader(
  openSession: DbSessionFactory,
): OrderHistoryReader {
  async function read(email?: string): Promise<readonly OrderHistoryRow[]> {
    const session = await openSession();
    try {
      const query = session.db.select().from(enrollmentOrder);
      const rows = await (email === undefined
        ? query
        : query.where(
            eq(
              sql`lower(btrim(${enrollmentOrder.studentEmail}))`,
              email.trim().toLowerCase(),
            ),
          ));
      return rows.map(toSource);
    } finally {
      await session.close();
    }
  }
  return { all: () => read(), byEmail: (email) => read(email) };
}
