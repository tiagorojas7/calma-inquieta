import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { createDrizzleIntensiveRepository } from "~/modules/workshops/infrastructure/drizzle-intensive-repository";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  buildStoredIntensive,
  ID_A,
  ID_B,
} from "~/testing/contracts/intensive-repository.contract";
import { buildNewProject } from "~/testing/contracts/intensive-project-repository.contract";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import { createTestOrderStock } from "~/testing/db/order-stock";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleIntensiveRequestRepository } from "./drizzle-intensive-request-repository";
import { createDrizzleWorkshopSupplierLinesReader } from "./drizzle-workshop-supplier-lines-reader";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

const SUPPLIER_SUR = "5a000000-0000-4000-8000-000000000001";
const SUPPLIER_NORTE = "5a000000-0000-4000-8000-000000000002";
const VARIANT = "5c000000-0000-4000-8000-000000000001";

const pesos = (centavos: number) => {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error("invalid amount");
  return money.value;
};

/** A November workshop (Cerámica) and a December one (Pintura), no requests yet. */
async function setup() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  const workshops = createDrizzleIntensiveRepository(openSession);
  const plain = { teacherId: null, percentage: null, images: [] };
  await workshops.insert(
    buildStoredIntensive({ ...plain, status: "published" }),
    buildNewProject({ id: "c0000000-0000-4000-8000-0000000000c1" }),
  );
  await workshops.insert(
    buildStoredIntensive({
      ...plain,
      id: ID_B,
      slug: "pintura",
      name: "Pintura sobre cerámica",
      eventDate: "2026-12-05",
      status: "published",
    }),
    buildNewProject({ id: "c0000000-0000-4000-8000-0000000000c2" }),
  );
  const repo = createDrizzleIntensiveRequestRepository(
    openSession,
    createTestOrderStock(openSession).port,
  );
  let counter = 0;
  return {
    reader: createDrizzleWorkshopSupplierLinesReader(openSession),
    /** Inserts a request of the workshop and returns its id. */
    request: async (
      intensiveId: string,
      status: "confirmed" | "cancelled" | "pending_confirmation",
    ) => {
      counter += 1;
      const n = String(counter).padStart(12, "0");
      const base = {
        id: `44444444-4444-4444-8444-${n}`,
        publicId: `public-id-${n}-abcdefgh`,
        email: `alumna${String(counter)}@example.com`,
        intensiveId,
      };
      const stored =
        status === "pending_confirmation"
          ? buildStoredRequest(base)
          : buildStoredRequest({
              ...base,
              status,
              paidAmount: pesos(1_500_000),
              paidOn: "2026-10-20",
              confirmedBy: "owner@example.com",
              confirmedAt: new Date("2026-10-20T15:00:00.000Z"),
              ...(status === "cancelled"
                ? {
                    cancelReason: "no puede asistir",
                    cancelledBy: "owner@example.com",
                    cancelledAt: new Date("2026-10-26T15:00:00.000Z"),
                  }
                : {}),
            });
      await repo.insert(stored);
      return stored.id;
    },
    allocate: async (
      requestId: string,
      position: number,
      line: {
        readonly supplierId: string;
        readonly supplierName: string;
        readonly materialName: string;
        readonly quantity: number;
        readonly unitCostCentavos: number | null;
        readonly source: "stock" | "supplier";
      },
    ) => {
      const session = await openSession();
      try {
        await session.db.execute(
          sql`INSERT INTO intensive_request_material
              (request_id, position, variant_id, material_name, variant_label,
               supplier_id, supplier_name, quantity, unit_cost_centavos, source)
              VALUES (${requestId}, ${position}, ${VARIANT}, ${line.materialName},
                      '1 kg', ${line.supplierId}, ${line.supplierName},
                      ${line.quantity}, ${line.unitCostCentavos}, ${line.source})`,
        );
      } finally {
        await session.close();
      }
    },
  };
}

const arcilla = (
  overrides: Partial<{
    quantity: number;
    unitCostCentavos: number | null;
    source: "stock" | "supplier";
  }> = {},
) => ({
  supplierId: SUPPLIER_SUR,
  supplierName: "Cerámica Sur",
  materialName: "Arcilla",
  quantity: 2,
  unitCostCentavos: 300_000 as number | null,
  source: "supplier" as const,
  ...overrides,
});

describe("createDrizzleWorkshopSupplierLinesReader", () => {
  it("lists the supplier lines of the confirmed requests of the workshops held that month", async () => {
    const { reader, request, allocate } = await setup();
    const confirmed = await request(ID_A, "confirmed");
    await allocate(confirmed, 0, arcilla());
    await allocate(
      confirmed,
      1,
      arcilla({ quantity: 3, unitCostCentavos: null }),
    );
    await allocate(confirmed, 2, {
      ...arcilla({ quantity: 1, unitCostCentavos: 80_000 }),
      supplierId: SUPPLIER_NORTE,
      supplierName: "Esmaltes Norte",
      materialName: "Esmalte",
    });

    const lines = await reader.lines("2026-11");

    expect(
      [...lines].sort((a, b) => a.materialName.localeCompare(b.materialName)),
    ).toEqual([
      {
        workshopName: "Cerámica de fin de semana",
        supplierId: SUPPLIER_SUR,
        supplierName: "Cerámica Sur",
        materialName: "Arcilla",
        variantLabel: "1 kg",
        quantity: 2,
        unitCostCentavos: 300_000,
      },
      {
        workshopName: "Cerámica de fin de semana",
        supplierId: SUPPLIER_SUR,
        supplierName: "Cerámica Sur",
        materialName: "Arcilla",
        variantLabel: "1 kg",
        quantity: 3,
        unitCostCentavos: null,
      },
      {
        workshopName: "Cerámica de fin de semana",
        supplierId: SUPPLIER_NORTE,
        supplierName: "Esmaltes Norte",
        materialName: "Esmalte",
        variantLabel: "1 kg",
        quantity: 1,
        unitCostCentavos: 80_000,
      },
    ]);
  });

  it("leaves out stock lines, cancelled requests and other months", async () => {
    const { reader, request, allocate } = await setup();
    const fromStock = await request(ID_A, "confirmed");
    await allocate(fromStock, 0, arcilla({ source: "stock" }));
    const cancelled = await request(ID_A, "cancelled");
    await allocate(cancelled, 0, arcilla());
    const december = await request(ID_B, "confirmed");
    await allocate(december, 0, arcilla({ quantity: 4 }));

    expect(await reader.lines("2026-11")).toEqual([]);
    expect(await reader.lines("2026-10")).toEqual([]);
    expect(await reader.lines("2026-12")).toEqual([
      {
        workshopName: "Pintura sobre cerámica",
        supplierId: SUPPLIER_SUR,
        supplierName: "Cerámica Sur",
        materialName: "Arcilla",
        variantLabel: "1 kg",
        quantity: 4,
        unitCostCentavos: 300_000,
      },
    ]);
  });
});
