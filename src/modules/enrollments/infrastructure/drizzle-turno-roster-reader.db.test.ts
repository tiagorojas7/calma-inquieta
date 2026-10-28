import { afterAll, describe, expect, it } from "vitest";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleTurnoRosterReader } from "./drizzle-turno-roster-reader";

const PERIOD = "00000000-0000-4000-8000-000000000003";
const TURNO = "00000000-0000-4000-8000-000000000004";
const OTHER_TURNO = "00000000-0000-4000-8000-000000000005";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

describe("createDrizzleTurnoRosterReader", () => {
  it("lists the active orders of one period and turno by student name", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const openSession = createDbSessionFactory({
      connectionString: database.url,
    });
    const session = await openSession();
    let n = 0;
    const add = async (
      overrides: Partial<typeof enrollmentOrder.$inferInsert>,
    ) => {
      n += 1;
      const status = overrides.status ?? "paid";
      await session.db.insert(enrollmentOrder).values({
        id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
        publicId: `order-${String(n).padStart(17, "0")}`,
        number: `CI-2026-${String(n).padStart(4, "0")}`,
        status,
        source: "public",
        workshopId: "00000000-0000-4000-8000-0000000000aa",
        periodId: PERIOD,
        period: "2026-10",
        turnoId: TURNO,
        workshopName: "Cerámica",
        turnoLabel: "Lunes tarde",
        weekday: 1,
        startsAt: "18:00",
        endsAt: "20:00",
        studentName: "Ana Pérez",
        studentEmail: "ana@example.com",
        studentPhoneDigits: "5493515550101",
        feeCentavos: 5_000_000,
        materialsCentavos: 0,
        totalCentavos: 5_000_000,
        policyVersion: "2026-10",
        requestedAt: new Date("2026-10-01T12:00:00Z"),
        paidAt:
          status === "pending_confirmation" ? null : new Date("2026-10-02Z"),
        paidAmountCentavos:
          status === "pending_confirmation" ? null : 5_000_000,
        ...(status === "cancelled"
          ? { cancelledAt: new Date("2026-10-03Z"), cancelReason: "x" }
          : {}),
        ...overrides,
      });
    };
    try {
      await add({ studentName: "Zoe Ruiz", studentEmail: " Zoe@Example.com " });
      await add({ studentName: "Ana Pérez", status: "materials_requested" });
      await add({
        studentName: "Caro Díaz",
        studentEmail: "caro@example.com",
        status: "pending_confirmation",
      });
      await add({
        studentName: "Cancelada",
        studentEmail: "cancel@example.com",
        status: "cancelled",
      });
      await add({
        studentName: "Otro turno",
        studentEmail: "otro@example.com",
        turnoId: OTHER_TURNO,
      });
    } finally {
      await session.close();
    }

    const roster = await createDrizzleTurnoRosterReader(openSession).forTurno(
      PERIOD,
      TURNO,
    );

    expect(roster).toEqual([
      {
        email: "ana@example.com",
        name: "Ana Pérez",
        orderNumber: "CI-2026-0002",
        feePaid: true,
      },
      {
        email: "caro@example.com",
        name: "Caro Díaz",
        orderNumber: "CI-2026-0003",
        feePaid: false,
      },
      {
        email: "zoe@example.com",
        name: "Zoe Ruiz",
        orderNumber: "CI-2026-0001",
        feePaid: true,
      },
    ]);
  });
});
