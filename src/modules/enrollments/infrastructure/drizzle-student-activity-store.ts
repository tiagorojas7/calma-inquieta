import { eq, sql } from "drizzle-orm";
import { enrollmentOrder, student } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import type { StudentActivityStore } from "../application/student-activity";

const orderEmail = sql<string>`lower(btrim(${enrollmentOrder.studentEmail}))`;

/**
 * Reads and writes `student.active`. A profile answers to its own email and to
 * the email snapshot of each of her orders, because the registry groups by the
 * order email and a later enrollment can change the profile email.
 */
export function createDrizzleStudentActivityStore(
  openSession: DbSessionFactory,
): StudentActivityStore {
  return {
    async inactiveEmails() {
      const session = await openSession();
      try {
        const own = await session.db
          .select({ email: student.email })
          .from(student)
          .where(eq(student.active, false));
        const fromOrders = await session.db
          .selectDistinct({ email: orderEmail })
          .from(enrollmentOrder)
          .innerJoin(student, eq(student.id, enrollmentOrder.studentId))
          .where(eq(student.active, false));
        return new Set([
          ...own.map((row) => row.email),
          ...fromOrders.map((row) => row.email),
        ]);
      } finally {
        await session.close();
      }
    },

    async setActive(email, active, at) {
      const key = email.trim().toLowerCase();
      const session = await openSession();
      try {
        const updated = await session.db
          .update(student)
          .set({ active, updatedAt: at })
          .where(
            sql`${student.email} = ${key} or ${student.id} in (
              select ${enrollmentOrder.studentId} from ${enrollmentOrder}
              where ${orderEmail} = ${key}
            )`,
          )
          .returning({ id: student.id });
        return updated.length > 0;
      } finally {
        await session.close();
      }
    },
  };
}
