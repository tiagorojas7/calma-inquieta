import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDbSessionFactory } from "~/platform/db/session";
import { enrollmentOrder, student } from "~/platform/db/schema/enrollments";
import { runOrderRepositoryContract } from "~/testing/contracts/order-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createTestOrderStock } from "~/testing/db/order-stock";
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
  const stock = createTestOrderStock(openSession);
  return {
    openSession,
    stock,
    repository: createDrizzleOrderRepository(openSession, stock.port),
    activity: createDrizzleStudentActivityStore(openSession),
    confirmedSeats: (periodId: string, turnoId: string) =>
      seats.confirmedSeats(periodId, turnoId),
  };
}

runOrderRepositoryContract(async () => {
  const { openSession, repository, activity, confirmedSeats, stock } =
    await freshRepository();
  return {
    repository,
    activity,
    stock,
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

describe("material sales and the public order page", () => {
  it("finds the monthly record by its public id, never a sale", async () => {
    const { openSession, repository } = await freshRepository();
    const created = await repository.create(
      orderDraft({
        workshopId: "00000000-0000-4000-8000-000000000001",
        periodId: "00000000-0000-4000-8000-000000000011",
        turnoId: "00000000-0000-4000-8000-000000000021",
      }),
    );
    if (!created.ok) throw new Error("fixture order");
    const salePublicId = "S".repeat(22);
    const session = await openSession();
    try {
      await session.db.execute(sql`
        insert into enrollment_order (
          id, student_id, public_id, number, status, source, workshop_id,
          period_id, period, turno_id, workshop_name, turno_label, weekday,
          starts_at, ends_at, student_name, student_email,
          student_phone_digits, fee_centavos, materials_centavos,
          total_centavos, policy_version, requested_at, kind, parent_order_id
        )
        select gen_random_uuid(), student_id, ${salePublicId}, 'CI-2026-0900',
          'pending_confirmation', source, workshop_id, period_id, period,
          turno_id, workshop_name, turno_label, weekday, starts_at, ends_at,
          student_name, student_email, student_phone_digits, 0, 400000, 400000,
          policy_version, requested_at, 'material_sale', id
        from enrollment_order where id = ${created.value.id}`);
    } finally {
      await session.close();
    }

    expect(await repository.findByPublicId(salePublicId)).toBeNull();
    expect((await repository.findByPublicId(created.value.publicId))?.id).toBe(
      created.value.id,
    );
  });
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

describe("panel read state at creation", () => {
  const draft = (overrides: Parameters<typeof orderDraft>[0] = {}) =>
    orderDraft({
      workshopId: "00000000-0000-4000-8000-000000000001",
      periodId: "00000000-0000-4000-8000-000000000011",
      turnoId: "00000000-0000-4000-8000-000000000021",
      ...overrides,
    });

  async function seenColumns(
    openSession: Awaited<ReturnType<typeof freshRepository>>["openSession"],
  ) {
    const session = await openSession();
    try {
      return await session.db
        .select({
          publicId: enrollmentOrder.publicId,
          seenAt: enrollmentOrder.seenAt,
          seenBy: enrollmentOrder.seenBy,
        })
        .from(enrollmentOrder);
    } finally {
      await session.close();
    }
  }

  it("stores a public order unseen", async () => {
    const { openSession, repository } = await freshRepository();
    expect((await repository.create(draft())).ok).toBe(true);

    expect(await seenColumns(openSession)).toEqual([
      expect.objectContaining({ seenAt: null, seenBy: null }),
    ]);
  });

  it("stores an order an admin created already seen by its creator", async () => {
    const { openSession, repository } = await freshRepository();
    const requestedAt = new Date("2026-10-30T15:00:00Z");
    expect(
      (
        await repository.create(
          draft({ requestedAt, createdBy: "agus@example.com" }),
        )
      ).ok,
    ).toBe(true);

    expect(await seenColumns(openSession)).toEqual([
      expect.objectContaining({
        seenAt: requestedAt,
        seenBy: "agus@example.com",
      }),
    ]);
  });
});
