import { afterAll } from "vitest";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import { createDbSessionFactory } from "~/platform/db/session";
import { runStudentOrderSourceContract } from "~/testing/contracts/student-order-source.contract";
import { studentOrder } from "~/testing/fakes/student-builders";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleOrderHistoryReader } from "./drizzle-order-history-reader";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

runStudentOrderSourceContract(async () => {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  let next = 0;
  return {
    source: createDrizzleOrderHistoryReader(openSession),
    async add(overrides = {}) {
      next += 1;
      const order = studentOrder(next, overrides);
      const session = await openSession();
      try {
        await session.db.insert(enrollmentOrder).values({
          id: order.id,
          publicId: `order-${String(next).padStart(17, "0")}`,
          number: order.number,
          status: order.status,
          source: "public",
          workshopId: order.workshopId,
          periodId: "00000000-0000-4000-8000-000000000003",
          period: order.period,
          turnoId: "00000000-0000-4000-8000-000000000004",
          workshopName: order.workshopName,
          turnoLabel: order.turnoLabel,
          weekday: 2,
          startsAt: "18:00",
          endsAt: "20:00",
          studentName: order.studentName,
          studentEmail: order.studentEmail,
          studentPhoneDigits: order.studentPhoneDigits,
          feeCentavos: order.total.toCentavos(),
          materialsCentavos: 0,
          totalCentavos: order.total.toCentavos(),
          policyVersion: "2026-10",
          requestedAt: order.requestedAt,
          paidAt: order.paidAt,
          paidAmountCentavos:
            order.paidAt === null ? null : order.total.toCentavos(),
        });
      } finally {
        await session.close();
      }
      return order;
    },
  };
});
