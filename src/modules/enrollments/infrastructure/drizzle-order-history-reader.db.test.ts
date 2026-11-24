import { afterAll, describe, expect, it } from "vitest";
import { enrollmentOrder, student } from "~/platform/db/schema/enrollments";
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

describe("createDrizzleOrderHistoryReader material sales", () => {
  it("leaves a sale out of the registry, and shows it in the history of its student with its kind", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const openSession = createDbSessionFactory({
      connectionString: database.url,
    });
    const studentId = "00000000-0000-4000-8002-0000000000f1";
    const base = {
      studentId,
      source: "public",
      workshopId: "00000000-0000-4000-8000-0000000000aa",
      periodId: "00000000-0000-4000-8000-000000000003",
      period: "2026-11",
      turnoId: "00000000-0000-4000-8000-000000000004",
      workshopName: "Cerámica",
      turnoLabel: "Martes",
      weekday: 2,
      startsAt: "18:00",
      endsAt: "20:00",
      studentName: "Ana Pérez",
      studentEmail: "ana@example.com",
      studentPhoneDigits: "5493515550001",
      policyVersion: "2026-11",
      requestedAt: new Date("2026-11-01T12:00:00Z"),
      status: "paid",
      paidAt: new Date("2026-11-02T12:00:00Z"),
    } as const;
    const session = await openSession();
    try {
      await session.db.insert(student).values({
        id: studentId,
        fullName: "Ana Pérez",
        email: "ana@example.com",
        phoneDigits: "5493515550001",
        createdAt: base.requestedAt,
        updatedAt: base.requestedAt,
      });
      await session.db.insert(enrollmentOrder).values([
        {
          ...base,
          id: "00000000-0000-4000-8000-0000000000e1",
          publicId: "order-00000000000000001",
          number: "CI-2026-0001",
          feeCentavos: 5_800_000,
          materialsCentavos: 0,
          totalCentavos: 5_800_000,
          paidAmountCentavos: 5_800_000,
        },
        {
          ...base,
          id: "00000000-0000-4000-8000-0000000000e2",
          publicId: "order-00000000000000002",
          number: "CI-2026-0002",
          kind: "material_sale",
          parentOrderId: "00000000-0000-4000-8000-0000000000e1",
          feeCentavos: 0,
          materialsCentavos: 400_000,
          totalCentavos: 400_000,
          paidAmountCentavos: 400_000,
          requestedAt: new Date("2026-11-05T12:00:00Z"),
        },
      ]);
    } finally {
      await session.close();
    }
    const reader = createDrizzleOrderHistoryReader(openSession);

    // The registry and the reminders read every enrollment, never a sale.
    expect((await reader.all()).map((order) => order.number)).toEqual([
      "CI-2026-0001",
    ]);
    // One student's own history lists her sales too, marked as such.
    const history = await reader.byEmail(" Ana@Example.com ");
    expect(
      history.map((order) => [order.number, order.kind ?? "enrollment"]).sort(),
    ).toEqual([
      ["CI-2026-0001", "enrollment"],
      ["CI-2026-0002", "material_sale"],
    ]);
  });
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
        const studentId = `00000000-0000-4000-8002-${String(next).padStart(12, "0")}`;
        await session.db.insert(student).values({
          id: studentId,
          fullName: order.studentName,
          email: order.studentEmail,
          phoneDigits: order.studentPhoneDigits,
          createdAt: order.requestedAt,
          updatedAt: order.requestedAt,
        });
        await session.db.insert(enrollmentOrder).values({
          id: order.id,
          studentId,
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
