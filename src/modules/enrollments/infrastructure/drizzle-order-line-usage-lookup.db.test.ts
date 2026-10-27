import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { enrollmentOrder, orderLine } from "~/platform/db/schema/enrollments";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleOrderLineUsageLookup } from "./drizzle-order-line-usage-lookup";

const created: TestDatabase[] = [];

afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

describe("createDrizzleOrderLineUsageLookup", () => {
  it("returns variants referenced by historical order lines", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const openSession = createDbSessionFactory({
      connectionString: database.url,
    });
    const session = await openSession();
    try {
      await session.db.insert(enrollmentOrder).values({
        id: "00000000-0000-4000-8000-000000000501",
        publicId: "historical-order",
        number: "CI-2026-0001",
        status: "pending_confirmation",
        source: "public",
        workshopId: "00000000-0000-4000-8000-000000000502",
        periodId: "00000000-0000-4000-8000-000000000503",
        period: "2026-10",
        turnoId: "00000000-0000-4000-8000-000000000504",
        workshopName: "Workshop",
        turnoLabel: "Morning",
        weekday: 1,
        startsAt: "09:00:00",
        endsAt: "10:00:00",
        studentName: "Student",
        studentEmail: "student@example.com",
        studentPhoneDigits: "3515555555",
        feeCentavos: 10_000,
        materialsCentavos: 12_500,
        totalCentavos: 22_500,
        policyVersion: "v1",
        requestedAt: new Date("2026-10-20T12:00:00.000Z"),
      });
      await session.db.insert(orderLine).values({
        orderId: "00000000-0000-4000-8000-000000000501",
        position: 0,
        materialId: "00000000-0000-4000-8000-000000000601",
        variantId: "00000000-0000-4000-8000-000000000602",
        materialName: "Material",
        variantLabel: "Variant",
        unitPriceCentavos: 12_500,
        quantity: 1,
        supplierId: "00000000-0000-4000-8000-000000000603",
        supplierName: "Supplier",
      });
    } finally {
      await session.close();
    }

    const lookup = createDrizzleOrderLineUsageLookup(openSession);
    await expect(
      lookup.findUsedVariantIds([
        "00000000-0000-4000-8000-000000000602",
        "00000000-0000-4000-8000-000000000604",
      ]),
    ).resolves.toEqual(new Set(["00000000-0000-4000-8000-000000000602"]));
  });
});
