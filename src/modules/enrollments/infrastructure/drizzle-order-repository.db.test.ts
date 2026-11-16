import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { enrollmentOrder, student } from "~/platform/db/schema/enrollments";
import { runOrderRepositoryContract } from "~/testing/contracts/order-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleOrderRepository } from "./drizzle-order-repository";
import { createDrizzleSeatLedger } from "./drizzle-seat-ledger";
import { createDrizzleStudentActivityStore } from "./drizzle-student-activity-store";
import { orderDraft } from "~/testing/fakes/enrollments-builders";

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
  const seats = createDrizzleSeatLedger(openSession);
  return {
    openSession,
    repository: createDrizzleOrderRepository(openSession),
    activity: createDrizzleStudentActivityStore(openSession),
    confirmedSeats: (periodId: string, turnoId: string) =>
      seats.confirmedSeats(periodId, turnoId),
  };
}

runOrderRepositoryContract(async () => {
  const { openSession, repository, activity, confirmedSeats } =
    await freshRepository();
  return {
    repository,
    activity,
    confirmedSeats,
    failCreateAfterNumbering: async (draft) => {
      const session = await openSession();
      try {
        const collisionStudentId = crypto.randomUUID();
        await session.db.insert(student).values({
          id: collisionStudentId,
          fullName: "Collision Student",
          email: "collision@example.com",
          phoneDigits: "5493510000000",
          createdAt: draft.requestedAt,
          updatedAt: draft.requestedAt,
        });
        await session.db.insert(enrollmentOrder).values({
          id: crypto.randomUUID(),
          studentId: collisionStudentId,
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
          await session.db.delete(student);
        } finally {
          await session.close();
        }
      }
    },
  };
});

describe("student identity association", () => {
  const workshopA = "00000000-0000-4000-8000-000000000001";
  const workshopB = "00000000-0000-4000-8000-000000000002";
  const periodA = "00000000-0000-4000-8000-000000000011";
  const periodB = "00000000-0000-4000-8000-000000000012";
  const turnoA = "00000000-0000-4000-8000-000000000021";

  const draft = (overrides: Parameters<typeof orderDraft>[0] = {}) =>
    orderDraft({
      workshopId: workshopA,
      periodId: periodA,
      turnoId: turnoA,
      ...overrides,
    });

  it("creates one durable profile and associates later months by email or phone", async () => {
    const { openSession, repository } = await freshRepository();
    expect((await repository.create(draft())).ok).toBe(true);
    expect(
      (
        await repository.create(
          draft({
            publicId: "B".repeat(22),
            workshopId: workshopB,
            periodId: periodB,
            period: "2026-11",
            student: {
              fullName: "Ana Pérez",
              email: "new-email@example.com",
              phoneDigits: "5493515551234",
            },
          }),
        )
      ).ok,
    ).toBe(true);

    const session = await openSession();
    try {
      const profiles = await session.db.select().from(student);
      const orders = await session.db.select().from(enrollmentOrder);
      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toMatchObject({
        fullName: "Ana Pérez",
        email: "new-email@example.com",
        phoneDigits: "5493515551234",
      });
      expect(new Set(orders.map((order) => order.studentId))).toEqual(
        new Set([profiles[0]?.id]),
      );
    } finally {
      await session.close();
    }
  });

  it("rejects a second monthly record even through another contact channel", async () => {
    const { repository } = await freshRepository();
    expect((await repository.create(draft())).ok).toBe(true);

    const duplicate = await repository.create(
      draft({
        publicId: "B".repeat(22),
        workshopId: workshopB,
        periodId: periodB,
        student: {
          fullName: "Ana Pérez",
          email: "other@example.com",
          phoneDigits: "5493515551234",
        },
      }),
    );

    expect(duplicate).toEqual({
      ok: false,
      error: { kind: "duplicate-order" },
    });
  });

  it("fails closed when email and phone identify different profiles", async () => {
    const { openSession, repository } = await freshRepository();
    expect((await repository.create(draft())).ok).toBe(true);
    expect(
      (
        await repository.create(
          draft({
            publicId: "B".repeat(22),
            periodId: periodB,
            period: "2026-11",
            student: {
              fullName: "Bea Gómez",
              email: "bea@example.com",
              phoneDigits: "5493515559999",
            },
          }),
        )
      ).ok,
    ).toBe(true);

    const conflict = await repository.create(
      draft({
        publicId: "C".repeat(22),
        periodId: "00000000-0000-4000-8000-000000000013",
        period: "2026-12",
        student: {
          fullName: "Conflicting Person",
          email: "ana@example.com",
          phoneDigits: "5493515559999",
        },
      }),
    );

    expect(conflict).toEqual({
      ok: false,
      error: { kind: "duplicate-order" },
    });
    const session = await openSession();
    try {
      expect(await session.db.select().from(student)).toHaveLength(2);
    } finally {
      await session.close();
    }
  });
});
