import { afterAll } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import { runOrderRepositoryContract } from "~/testing/contracts/order-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleOrderRepository } from "./drizzle-order-repository";

const created: TestDatabase[] = [];

afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function freshRepository() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  return { openSession, repository: createDrizzleOrderRepository(openSession) };
}

runOrderRepositoryContract(async () => {
  const { openSession, repository } = await freshRepository();
  return {
    repository,
    failCreateAfterNumbering: async (draft) => {
      const session = await openSession();
      try {
        await session.db.insert(enrollmentOrder).values({
          id: crypto.randomUUID(),
          publicId: draft.publicId,
          number: "CI-2000-0001",
          status: "cancelled",
          source: "public",
          workshopId: draft.workshopId,
          workshopName: draft.workshopName,
          periodId: draft.periodId,
          period: draft.period,
          turnoId: draft.turnoId,
          turnoLabel: draft.turnoLabel,
          weekday: draft.weekday,
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          studentName: draft.student.fullName,
          studentEmail: draft.student.email,
          studentPhoneDigits: draft.student.phoneDigits,
          feeCentavos: draft.fee.toCentavos(),
          materialsCentavos: draft.materialsTotal.toCentavos(),
          totalCentavos: draft.total.toCentavos(),
          policyVersion: draft.policyVersion,
          requestedAt: draft.requestedAt,
        });
      } finally {
        await session.close();
      }
      try {
        return await repository.create(draft);
      } finally {
        const session = await openSession();
        try {
          await session.db.delete(enrollmentOrder);
        } finally {
          await session.close();
        }
      }
    },
  };
});
