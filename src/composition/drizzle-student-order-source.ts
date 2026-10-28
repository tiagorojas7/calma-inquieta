import { eq, sql } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import {
  normalizeStudentEmail,
  type StudentOrderSource,
  type StudentOrderStatus,
  type StudentSourceOrder,
} from "~/modules/students";

type Row = typeof enrollmentOrder.$inferSelect;

function toSource(row: Row): StudentSourceOrder {
  const total = Money.fromCentavos(row.totalCentavos);
  if (!total.ok) throw new Error("persisted order total is invalid");
  return {
    id: row.id,
    number: row.number,
    status: row.status as StudentOrderStatus,
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
 * Lives in composition because a module's infrastructure may import only its
 * own schema file, and this read crosses from students to enrollment orders.
 * Reads the orders the registry is derived from. Grouping and filtering run
 * in the domain, so this stays a plain read; the studio handles hundreds of
 * orders a year, which one request can load.
 */
export function createDrizzleStudentOrderSource(
  openSession: DbSessionFactory,
): StudentOrderSource {
  async function read(email?: string): Promise<readonly StudentSourceOrder[]> {
    const session = await openSession();
    try {
      const query = session.db.select().from(enrollmentOrder);
      const rows = await (email === undefined
        ? query
        : query.where(
            eq(
              sql`lower(btrim(${enrollmentOrder.studentEmail}))`,
              normalizeStudentEmail(email),
            ),
          ));
      return rows.map(toSource);
    } finally {
      await session.close();
    }
  }
  return { all: () => read(), byEmail: (email) => read(email) };
}
