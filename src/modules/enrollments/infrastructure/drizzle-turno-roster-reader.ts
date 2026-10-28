import { and, asc, eq, ne } from "drizzle-orm";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import {
  rosterFeePaid,
  type TurnoRosterReader,
} from "../application/turno-roster";
import type { OrderStatus } from "../domain/order-core";

/** One short-lived session per call. */
export function createDrizzleTurnoRosterReader(
  openSession: DbSessionFactory,
): TurnoRosterReader {
  return {
    async forTurno(periodId, turnoId) {
      const session = await openSession();
      try {
        const rows = await session.db
          .select()
          .from(enrollmentOrder)
          .where(
            and(
              eq(enrollmentOrder.periodId, periodId),
              eq(enrollmentOrder.turnoId, turnoId),
              ne(enrollmentOrder.status, "cancelled"),
            ),
          )
          .orderBy(
            asc(enrollmentOrder.studentName),
            asc(enrollmentOrder.number),
          );
        return rows.map((row) => ({
          email: row.studentEmail.trim().toLowerCase(),
          name: row.studentName,
          orderNumber: row.number,
          feePaid: rosterFeePaid(row.status as OrderStatus),
        }));
      } finally {
        await session.close();
      }
    },
  };
}
