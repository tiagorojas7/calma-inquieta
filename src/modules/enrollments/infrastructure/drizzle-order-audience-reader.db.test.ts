import { afterAll, describe, expect, it } from "vitest";
import { enrollmentOrder } from "~/platform/db/schema/enrollments";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleOrderAudienceReader } from "./drizzle-order-audience-reader";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

type Values = typeof enrollmentOrder.$inferInsert;
const unpaid = { paidAt: null, paidAmountCentavos: null } as const;

async function setup() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  let next = 0;
  async function add(overrides: Partial<Values> = {}) {
    next += 1;
    const session = await openSession();
    try {
      await session.db.insert(enrollmentOrder).values({
        id: `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`,
        publicId: `order-${String(next).padStart(17, "0")}`,
        number: `CI-2026-${String(next).padStart(4, "0")}`,
        status: "paid",
        source: "public",
        workshopId: "00000000-0000-4000-8000-000000000001",
        periodId: "00000000-0000-4000-8000-000000000003",
        period: "2026-11",
        turnoId: "00000000-0000-4000-8000-000000000004",
        workshopName: "Bordado",
        turnoLabel: "Martes",
        weekday: 2,
        startsAt: "17:30",
        endsAt: "19:30",
        studentName: "Ana Pérez",
        studentEmail: `ana${String(next)}@example.com`,
        studentPhoneDigits: "5493511234567",
        feeCentavos: 5_800_000,
        materialsCentavos: 0,
        totalCentavos: 5_800_000,
        policyVersion: "2026-10",
        requestedAt: new Date("2026-10-30T12:00:00.000Z"),
        paidAt: new Date("2026-10-31T12:00:00.000Z"),
        paidAmountCentavos: 5_800_000,
        ...overrides,
      });
    } finally {
      await session.close();
    }
  }
  return { reader: createDrizzleOrderAudienceReader(openSession), add };
}

describe("drizzle order audience reader", () => {
  it("lists paid orders of the weekday and period, with the time and the public id", async () => {
    const { reader, add } = await setup();
    await add();
    await add({ status: "materials_received" });
    await add({ status: "pending_confirmation", ...unpaid });
    await add({ status: "cancelled" });
    await add({ weekday: 3 });
    await add({ period: "2026-12" });

    const rows = await reader.classesOn(2, "2026-11");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      studentEmail: "ana1@example.com",
      workshopName: "Bordado",
      startsAt: "17:30:00",
    });
    expect(rows[0]?.publicId).toMatch(/^order-/);
    expect(rows[0]?.total.toCentavos()).toBe(5_800_000);
  });

  it("lists pending orders requested inside the window only", async () => {
    const { reader, add } = await setup();
    const at = (iso: string) => ({
      status: "pending_confirmation",
      ...unpaid,
      requestedAt: new Date(iso),
    });
    await add(at("2026-10-30T12:00:00.000Z")); // from, included
    await add(at("2026-10-31T11:59:59.000Z")); // inside
    await add(at("2026-10-31T12:00:00.000Z")); // to, excluded
    await add(at("2026-10-29T12:00:00.000Z")); // too old
    await add({ requestedAt: new Date("2026-10-30T18:00:00.000Z") }); // paid

    const rows = await reader.pendingRequestedBetween(
      new Date("2026-10-30T12:00:00.000Z"),
      new Date("2026-10-31T12:00:00.000Z"),
    );

    expect(rows).toHaveLength(2);
  });
});
