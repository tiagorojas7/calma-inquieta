import { asc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { Refund } from "~/modules/intensive-requests";
import { createDrizzleIntensiveRepository } from "~/modules/workshops/infrastructure/drizzle-intensive-repository";
import { intensiveRequestMaterial } from "~/platform/db/schema/intensive-requests";
import {
  createDbSessionFactory,
  type DbSessionFactory,
} from "~/platform/db/session";
import {
  buildStoredIntensive,
  ID_A,
} from "~/testing/contracts/intensive-repository.contract";
import { buildNewProject } from "~/testing/contracts/intensive-project-repository.contract";
import {
  buildStoredRequest,
  runIntensiveRequestRepositoryContract,
} from "~/testing/contracts/intensive-request-repository.contract";
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

async function freshRepository() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  return {
    openSession,
    repo: createDrizzleIntensiveRequestRepository(
      openSession,
      createTestOrderStock(openSession).port,
    ),
  };
}

runIntensiveRequestRepositoryContract(
  async () => (await freshRepository()).repo,
);

describe("createDrizzleIntensiveRequestRepository", () => {
  it("has exactly the seat request columns", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ column_name: string }>(
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = 'intensive_seat_request' ORDER BY column_name`,
      );
      expect(rows.map((row) => row.column_name)).toEqual([
        "balance_at",
        "balance_by",
        "balance_centavos",
        "balance_note",
        "balance_paid_on",
        "cancel_reason",
        "cancelled_at",
        "cancelled_by",
        "confirmed_at",
        "confirmed_by",
        "created_at",
        "deposit_centavos",
        "email",
        "full_name",
        "id",
        "intensive_id",
        "paid_centavos",
        "paid_on",
        "payment_note",
        "phone_digits",
        "policy_accepted_at",
        "price_centavos",
        "project_id",
        "public_id",
        "refund_centavos",
        "refund_note",
        "refunded_on",
        "seen_at",
        "seen_by",
        "status",
      ]);
    } finally {
      await session.close();
    }
  });

  it("refuses an unknown status and a confirmed row without a deposit at the database", async () => {
    const { repo } = await freshRepository();

    await expect(
      repo.insert(buildStoredRequest({ status: "otra" as never })),
    ).rejects.toThrow();
    await expect(
      repo.insert(buildStoredRequest({ status: "confirmed" })),
    ).rejects.toThrow();
  });

  it("rejects a duplicate public id instead of reporting a duplicate request", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredRequest());

    await expect(
      repo.insert(
        buildStoredRequest({
          id: "3a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04",
          email: "otra@example.com",
        }),
      ),
    ).rejects.toThrow();
  });
});

const PROJECT_ONE = "c0000000-0000-4000-8000-0000000000c1";
const PROJECT_TWO = "c0000000-0000-4000-8000-0000000000c2";
const OTHER_INTENSIVE = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9aa2";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad money");
  return money.value;
};

/** A workshop with two projects (30.000/10.000 and 50.000/20.000) and a second one with none. */
async function seedWorkshops() {
  const fresh = await freshRepository();
  const workshops = createDrizzleIntensiveRepository(fresh.openSession);
  const plain = { teacherId: null, percentage: null, images: [] };
  await workshops.insert(
    buildStoredIntensive({ ...plain, status: "published" }),
    buildNewProject({ id: PROJECT_ONE }),
  );
  await workshops.addProject(
    buildNewProject({
      id: PROJECT_TWO,
      name: "Plato hondo",
      price: pesos(50000),
      deposit: pesos(20000),
    }),
  );
  await workshops.insert(
    buildStoredIntensive({
      ...plain,
      id: OTHER_INTENSIVE,
      slug: "otro-workshop",
    }),
  );
  return { ...fresh, workshops };
}

const withProject = (projectId: string, price: number, deposit: number) =>
  buildStoredRequest({
    projectId,
    price: pesos(price),
    deposit: pesos(deposit),
  });

describe("project choice", () => {
  it("stores the project with its price and deposit snapshot and reads them back", async () => {
    const { repo } = await seedWorkshops();

    expect(await repo.insert(withProject(PROJECT_TWO, 50000, 20000))).toEqual({
      ok: true,
      value: undefined,
    });

    const stored = await repo.findById(buildStoredRequest().id);
    expect(stored?.projectId).toBe(PROJECT_TWO);
    expect(stored?.price?.toCentavos()).toBe(5_000_000);
    expect(stored?.deposit?.toCentavos()).toBe(2_000_000);
  });

  it("keeps the snapshot when the project is edited afterwards", async () => {
    const { repo, workshops } = await seedWorkshops();
    await repo.insert(withProject(PROJECT_ONE, 30000, 10000));
    const project = await workshops.findProject(ID_A, PROJECT_ONE);
    if (!project) throw new Error("no project");

    await workshops.updateProject({
      ...project,
      name: "Renombrado",
      price: pesos(90000),
      deposit: pesos(40000),
    });

    const stored = await repo.findById(buildStoredRequest().id);
    expect(stored?.price?.toCentavos()).toBe(3_000_000);
    expect(stored?.deposit?.toCentavos()).toBe(1_000_000);
  });

  it("refuses an unknown project and writes no row", async () => {
    const { repo } = await seedWorkshops();

    const result = await repo.insert(
      withProject("c0000000-0000-4000-8000-0000000000ff", 30000, 10000),
    );

    expect(result).toEqual({ ok: false, error: { kind: "unknown-project" } });
    expect(await repo.findById(buildStoredRequest().id)).toBeNull();
  });

  it("refuses a project that belongs to another workshop", async () => {
    const { repo } = await seedWorkshops();

    const result = await repo.insert(
      buildStoredRequest({
        intensiveId: OTHER_INTENSIVE,
        projectId: PROJECT_ONE,
        price: pesos(30000),
        deposit: pesos(10000),
      }),
    );

    expect(result).toEqual({ ok: false, error: { kind: "unknown-project" } });
    expect(await repo.findById(buildStoredRequest().id)).toBeNull();
  });

  it("refuses a request for a project that was deleted", async () => {
    const { repo, workshops } = await seedWorkshops();
    expect(await workshops.deleteProject(ID_A, PROJECT_TWO)).toBe("deleted");

    const result = await repo.insert(withProject(PROJECT_TWO, 50000, 20000));

    expect(result).toEqual({ ok: false, error: { kind: "unknown-project" } });
    expect(await repo.findById(buildStoredRequest().id)).toBeNull();
  });

  it("never leaves a request pointing at a project deleted at the same moment", async () => {
    const { repo, workshops, openSession } = await seedWorkshops();
    const attempts = 12;
    const outcomes = await Promise.all(
      Array.from({ length: attempts }, async (_, index) => {
        const project = `c0000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`;
        await workshops.addProject(
          buildNewProject({ id: project, name: `Proyecto ${String(index)}` }),
        );
        const [deleted, inserted] = await Promise.all([
          workshops.deleteProject(ID_A, project),
          repo.insert(
            buildStoredRequest({
              id: `d0000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
              publicId: `public-id-${String(index)}-0000000`,
              email: `p${String(index)}@example.com`,
              projectId: project,
              price: pesos(30000),
              deposit: pesos(10000),
            }),
          ),
        ]);
        return { deleted, inserted };
      }),
    );

    // Either the delete saw the request (in-use) or the insert saw no project.
    for (const { deleted, inserted } of outcomes)
      expect(deleted === "deleted" ? !inserted.ok : inserted.ok).toBe(true);
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ dangling: number }>(
        sql`SELECT count(*)::int AS dangling FROM intensive_seat_request AS r
            WHERE r.project_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM intensive_project p WHERE p.id = r.project_id)`,
      );
      expect(rows[0]?.dangling).toBe(0);
    } finally {
      await session.close();
    }
  });
});

const SUPPLIER_A = "5a000000-0000-4000-8000-0000000000a1";
const SUPPLIER_B = "5a000000-0000-4000-8000-0000000000b2";
const CLAY = "5b000000-0000-4000-8000-0000000000c1";
const GLAZE = "5b000000-0000-4000-8000-0000000000c2";
const KG = "5c000000-0000-4000-8000-000000000001";
const HALF = "5c000000-0000-4000-8000-000000000002";
const BRUSH = "5c000000-0000-4000-8000-000000000003";
const WHEN = new Date("2026-10-22T15:00:00.000Z");

/** Two suppliers; clay in two sizes (the second has no cost yet) and a glaze. */
async function seedCatalog(openSession: DbSessionFactory) {
  const session = await openSession();
  try {
    const { db } = session;
    await db.execute(
      sql`INSERT INTO supplier (id, name, name_key, updated_by, updated_at) VALUES
          (${SUPPLIER_A}, 'Cerámica Sur', 'ceramica sur', 'test', now()),
          (${SUPPLIER_B}, 'Esmaltes Norte', 'esmaltes norte', 'test', now())`,
    );
    await db.execute(
      sql`INSERT INTO material (id, name, name_key, description, category, category_key, supplier_id, updated_by, updated_at) VALUES
          (${CLAY}, 'Arcilla', 'arcilla', 'Arcilla blanca', 'Arcillas', 'arcillas', ${SUPPLIER_A}, 'test', now()),
          (${GLAZE}, 'Esmalte', 'esmalte', 'Esmalte brillante', 'Esmaltes', 'esmaltes', ${SUPPLIER_B}, 'test', now())`,
    );
    await db.execute(
      sql`INSERT INTO material_variant (id, material_id, label, label_key, price_centavos, cost_centavos, position) VALUES
          (${KG}, ${CLAY}, '1 kg', '1 kg', 500000, 300000, 0),
          (${HALF}, ${CLAY}, '500 g', '500 g', 300000, NULL, 1),
          (${BRUSH}, ${GLAZE}, 'Pincel', 'pincel', 100000, 80000, 0)`,
    );
  } finally {
    await session.close();
  }
}

interface Allocated {
  readonly position: number;
  readonly variantId: string;
  readonly materialName: string;
  readonly variantLabel: string;
  readonly supplierName: string;
  readonly quantity: number;
  readonly unitCostCentavos: number | null;
  readonly source: string;
}

async function allocatedLines(
  openSession: DbSessionFactory,
  requestId: string,
): Promise<readonly Allocated[]> {
  const session = await openSession();
  try {
    return await session.db
      .select({
        position: intensiveRequestMaterial.position,
        variantId: intensiveRequestMaterial.variantId,
        materialName: intensiveRequestMaterial.materialName,
        variantLabel: intensiveRequestMaterial.variantLabel,
        supplierName: intensiveRequestMaterial.supplierName,
        quantity: intensiveRequestMaterial.quantity,
        unitCostCentavos: intensiveRequestMaterial.unitCostCentavos,
        source: intensiveRequestMaterial.source,
      })
      .from(intensiveRequestMaterial)
      .where(eq(intensiveRequestMaterial.requestId, requestId))
      .orderBy(asc(intensiveRequestMaterial.position));
  } finally {
    await session.close();
  }
}

const confirmOf = (id: string, capacity = 10) => ({
  id,
  capacity,
  amount: pesos(10000),
  paidOn: "2026-10-21",
  note: null,
  by: "duena@example.com",
  at: WHEN,
});

const cancelOf = (id: string, refund?: Refund) => ({
  id,
  reason: "no puede asistir",
  by: "duena@example.com",
  at: new Date("2026-10-23T15:00:00.000Z"),
  today: "2026-10-28",
  ...(refund === undefined ? {} : { refund }),
});

const noRefund: Refund = {
  amount: pesos(0),
  refundedOn: "2026-10-22",
  note: null,
};

const requestNumber = (index: number) =>
  `e0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

/** The nth pending request of project one (30.000 with a 10.000 deposit). */
const pendingRequest = (index: number, projectId = PROJECT_ONE) =>
  buildStoredRequest({
    id: requestNumber(index),
    publicId: `public-id-${String(index)}-0000000`,
    email: `alumna${String(index)}@example.com`,
    projectId,
    price: pesos(30000),
    deposit: pesos(10000),
  });

/** A workshop whose project one lists clay (1 kg x2, 500 g x1) and a brush. */
async function seedAllocation() {
  const seeded = await seedWorkshops();
  await seedCatalog(seeded.openSession);
  const stock = createTestOrderStock(seeded.openSession);
  const repo = createDrizzleIntensiveRequestRepository(
    seeded.openSession,
    stock.port,
  );
  const bill = [
    [KG, 2],
    [HALF, 1],
    [BRUSH, 1],
  ] as const;
  for (const [variantId, quantity] of bill)
    await seeded.workshops.addProjectMaterial({
      intensiveId: ID_A,
      projectId: PROJECT_ONE,
      variantId,
      quantity,
    });
  return { ...seeded, repo, stock };
}

describe("confirming allocates the project materials", () => {
  it("copies the bill onto the request and takes each line from the stock", async () => {
    const { repo, stock, openSession } = await seedAllocation();
    await stock.seed(KG, 5);
    await stock.seed(HALF, 1);
    await stock.seed(BRUSH, 3);
    await repo.insert(pendingRequest(1));

    const confirmed = await repo.confirm(confirmOf(requestNumber(1)));

    expect(confirmed.ok).toBe(true);
    expect(await allocatedLines(openSession, requestNumber(1))).toEqual([
      {
        position: 0,
        variantId: KG,
        materialName: "Arcilla",
        variantLabel: "1 kg",
        supplierName: "Cerámica Sur",
        quantity: 2,
        unitCostCentavos: 300000,
        source: "stock",
      },
      {
        position: 1,
        variantId: HALF,
        materialName: "Arcilla",
        variantLabel: "500 g",
        supplierName: "Cerámica Sur",
        quantity: 1,
        unitCostCentavos: null,
        source: "stock",
      },
      {
        position: 2,
        variantId: BRUSH,
        materialName: "Esmalte",
        variantLabel: "Pincel",
        supplierName: "Esmaltes Norte",
        quantity: 1,
        unitCostCentavos: 80000,
        source: "stock",
      },
    ]);
    expect(await stock.onHand(KG)).toBe(3);
    expect(await stock.onHand(HALF)).toBe(0);
    expect(await stock.onHand(BRUSH)).toBe(2);
  });

  it("sends a line whose stock is short to the supplier and takes nothing for it", async () => {
    const { repo, stock, openSession } = await seedAllocation();
    await stock.seed(KG, 1); // the bill needs 2
    await stock.seed(BRUSH, 3);
    await repo.insert(pendingRequest(1));

    const confirmed = await repo.confirm(confirmOf(requestNumber(1)));

    expect(confirmed.ok).toBe(true);
    const lines = await allocatedLines(openSession, requestNumber(1));
    expect(lines.map((line) => [line.variantLabel, line.source])).toEqual([
      ["1 kg", "supplier"],
      ["500 g", "supplier"],
      ["Pincel", "stock"],
    ]);
    expect(await stock.onHand(KG)).toBe(1);
    expect(await stock.onHand(HALF)).toBe(0);
    expect(await stock.onHand(BRUSH)).toBe(2);
  });

  it("keeps the allocated lines when the bill or the catalog change afterwards", async () => {
    const { repo, stock, workshops, openSession } = await seedAllocation();
    await stock.seed(KG, 5);
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));
    const before = await allocatedLines(openSession, requestNumber(1));

    await workshops.setProjectMaterialQuantity(ID_A, PROJECT_ONE, KG, 9);
    await workshops.removeProjectMaterial(ID_A, PROJECT_ONE, BRUSH);
    const session = await openSession();
    try {
      await session.db.execute(
        sql`UPDATE material_variant SET cost_centavos = 999900, label = '2 kg' WHERE id = ${KG}`,
      );
      await session.db.execute(
        sql`DELETE FROM material_variant WHERE id = ${HALF}`,
      );
    } finally {
      await session.close();
    }

    expect(await allocatedLines(openSession, requestNumber(1))).toEqual(before);
  });

  it("skips a bill line whose variant left the catalog and copies nothing for an empty bill", async () => {
    const { repo, stock, openSession } = await seedAllocation();
    const session = await openSession();
    try {
      await session.db.execute(
        sql`DELETE FROM material_variant WHERE id = ${HALF}`,
      );
    } finally {
      await session.close();
    }
    await stock.seed(KG, 5);
    await repo.insert(pendingRequest(1));
    await repo.insert(pendingRequest(2, PROJECT_TWO));

    await repo.confirm(confirmOf(requestNumber(1)));
    await repo.confirm(confirmOf(requestNumber(2)));

    const lines = await allocatedLines(openSession, requestNumber(1));
    expect(lines.map((line) => line.variantLabel)).toEqual(["1 kg", "Pincel"]);
    expect(await allocatedLines(openSession, requestNumber(2))).toEqual([]);
    expect(await stock.onHand(KG)).toBe(3);
  });

  it("allocates and takes nothing when the confirmation is refused", async () => {
    const { repo, stock, openSession } = await seedAllocation();
    await stock.seed(KG, 5);
    await repo.insert(pendingRequest(1));
    await repo.insert(pendingRequest(2));
    await repo.confirm(confirmOf(requestNumber(1), 1));

    const full = await repo.confirm(confirmOf(requestNumber(2), 1));

    expect(full).toEqual({ ok: false, error: { kind: "intensive-full" } });
    expect(await allocatedLines(openSession, requestNumber(2))).toEqual([]);
    expect(await stock.onHand(KG)).toBe(3);

    const again = await repo.confirm(confirmOf(requestNumber(1), 5));
    expect(again.ok).toBe(false);
    expect(await allocatedLines(openSession, requestNumber(1))).toHaveLength(3);
    expect(await stock.onHand(KG)).toBe(3);
  });

  it("never oversells: 8 concurrent confirmations on 3 units give 3 stock lines and 5 supplier lines", async () => {
    const { repo, stock, openSession, workshops } = await seedAllocation();
    for (const variantId of [HALF, BRUSH])
      await workshops.removeProjectMaterial(ID_A, PROJECT_ONE, variantId);
    await workshops.setProjectMaterialQuantity(ID_A, PROJECT_ONE, KG, 1);
    await stock.seed(KG, 3);
    for (let index = 1; index <= 8; index += 1)
      await repo.insert(pendingRequest(index));

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repo.confirm(confirmOf(requestNumber(index + 1), 8)),
      ),
    );

    expect(results.every((result) => result.ok)).toBe(true);
    const sources = (
      await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          allocatedLines(openSession, requestNumber(index + 1)),
        ),
      )
    ).flatMap((lines) => lines.map((line) => line.source));
    expect(sources.filter((source) => source === "stock")).toHaveLength(3);
    expect(sources.filter((source) => source === "supplier")).toHaveLength(5);
    expect(await stock.onHand(KG)).toBe(0);
    expect(await repo.confirmedSeats(ID_A)).toBe(8);
  });

  it("keeps capacity and stock right together: 8 confirmations, 6 seats, 3 units", async () => {
    const { repo, stock, openSession, workshops } = await seedAllocation();
    await workshops.removeProjectMaterial(ID_A, PROJECT_ONE, HALF);
    await workshops.removeProjectMaterial(ID_A, PROJECT_ONE, BRUSH);
    await workshops.setProjectMaterialQuantity(ID_A, PROJECT_ONE, KG, 1);
    await stock.seed(KG, 3);
    for (let index = 1; index <= 8; index += 1)
      await repo.insert(pendingRequest(index));

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repo.confirm(confirmOf(requestNumber(index + 1), 6)),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(6);
    expect(
      results.filter(
        (result) => !result.ok && result.error.kind === "intensive-full",
      ),
    ).toHaveLength(2);
    expect(await repo.confirmedSeats(ID_A)).toBe(6);
    const lines = (
      await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          allocatedLines(openSession, requestNumber(index + 1)),
        ),
      )
    ).flat();
    expect(lines).toHaveLength(6);
    expect(lines.filter((line) => line.source === "stock")).toHaveLength(3);
    expect(lines.filter((line) => line.source === "supplier")).toHaveLength(3);
    expect(await stock.onHand(KG)).toBe(0);
  });

  it("does not deadlock when concurrent requests list the same variants in opposite orders", async () => {
    const { repo, stock, openSession, workshops } = await seedAllocation();
    // Project two lists the variants in the opposite order to project one.
    await workshops.addProjectMaterial({
      intensiveId: ID_A,
      projectId: PROJECT_TWO,
      variantId: BRUSH,
      quantity: 1,
    });
    await workshops.addProjectMaterial({
      intensiveId: ID_A,
      projectId: PROJECT_TWO,
      variantId: KG,
      quantity: 1,
    });
    await stock.seed(KG, 4);
    await stock.seed(BRUSH, 4);
    for (let index = 1; index <= 8; index += 1)
      await repo.insert(
        pendingRequest(index, index % 2 === 0 ? PROJECT_ONE : PROJECT_TWO),
      );

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repo.confirm(confirmOf(requestNumber(index + 1), 8)),
      ),
    );

    expect(results.every((result) => result.ok)).toBe(true);
    const lines = (
      await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          allocatedLines(openSession, requestNumber(index + 1)),
        ),
      )
    ).flat();
    for (const variantId of [KG, BRUSH]) {
      const taken = lines
        .filter(
          (line) => line.variantId === variantId && line.source === "stock",
        )
        .reduce((sum, line) => sum + line.quantity, 0);
      expect(taken + (await stock.onHand(variantId))).toBe(4);
    }
  });
});

describe("cancelling returns the allocated material", () => {
  it("puts the stock lines back once and leaves the supplier lines alone", async () => {
    const { repo, stock, openSession } = await seedAllocation();
    await stock.seed(KG, 5);
    await stock.seed(BRUSH, 3);
    // 500 g has no stock: that line waits on the supplier.
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));
    expect([await stock.onHand(KG), await stock.onHand(BRUSH)]).toEqual([3, 2]);

    const cancelled = await repo.cancel(cancelOf(requestNumber(1), noRefund));

    expect(cancelled.ok).toBe(true);
    expect(await stock.onHand(KG)).toBe(5);
    expect(await stock.onHand(BRUSH)).toBe(3);
    expect(await stock.onHand(HALF)).toBe(0);
    const lines = await allocatedLines(openSession, requestNumber(1));
    expect(lines.map((line) => line.source)).toEqual([
      "stock",
      "supplier",
      "stock",
    ]);
  });

  it("puts every unit of a request with only stock lines back, as before", async () => {
    const { repo, stock } = await seedAllocation();
    await stock.seed(KG, 5);
    await stock.seed(HALF, 4);
    await stock.seed(BRUSH, 3);
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));
    expect([
      await stock.onHand(KG),
      await stock.onHand(HALF),
      await stock.onHand(BRUSH),
    ]).toEqual([3, 3, 2]);

    expect((await repo.cancel(cancelOf(requestNumber(1), noRefund))).ok).toBe(
      true,
    );

    expect([
      await stock.onHand(KG),
      await stock.onHand(HALF),
      await stock.onHand(BRUSH),
    ]).toEqual([5, 4, 3]);
  });

  it("puts the supplier lines already ordered into the stock once, and only those", async () => {
    const { repo, stock, openSession } = await seedAllocation();
    // No stock at all: the three lines wait on their suppliers.
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));
    const marked = await createDrizzleWorkshopSupplierLinesReader(
      openSession,
    ).markOrdered(ID_A, SUPPLIER_A);
    expect(marked).toBe(2);

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        repo.cancel(cancelOf(requestNumber(1), noRefund)),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    // Clay (supplier A, ordered): 1 kg x2 and 500 g x1. The brush (supplier B)
    // was never ordered, so it is only released.
    expect([
      await stock.onHand(KG),
      await stock.onHand(HALF),
      await stock.onHand(BRUSH),
    ]).toEqual([2, 1, 0]);
    expect((await repo.cancel(cancelOf(requestNumber(1), noRefund))).ok).toBe(
      false,
    );
    expect(await stock.onHand(KG)).toBe(2);
  });

  it("changes nothing when it is cancelled again, even at the same moment", async () => {
    const { repo, stock } = await seedAllocation();
    await stock.seed(KG, 5);
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        repo.cancel(cancelOf(requestNumber(1), noRefund)),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await stock.onHand(KG)).toBe(5);
    const again = await repo.cancel(cancelOf(requestNumber(1), noRefund));
    expect(again).toEqual({
      ok: false,
      error: { kind: "illegal-transition", from: "cancelled" },
    });
    expect(await stock.onHand(KG)).toBe(5);
  });

  it("returns nothing for a pending request and keeps the stock when the refund is refused", async () => {
    const { repo, stock } = await seedAllocation();
    await stock.seed(KG, 5);
    await repo.insert(pendingRequest(1));
    await repo.insert(pendingRequest(2));
    await repo.confirm(confirmOf(requestNumber(2)));
    expect(await stock.onHand(KG)).toBe(3);

    expect((await repo.cancel(cancelOf(requestNumber(1)))).ok).toBe(true);
    expect(await stock.onHand(KG)).toBe(3);

    const refused = await repo.cancel(cancelOf(requestNumber(2)));
    expect(refused).toMatchObject({ ok: false, error: { code: "required" } });
    expect(await stock.onHand(KG)).toBe(3);
    expect((await repo.findById(requestNumber(2)))?.status).toBe("confirmed");
  });

  it("frees the seat and the stock of a request that paid its balance, and keeps what it paid", async () => {
    const { repo, stock } = await seedAllocation();
    await stock.seed(KG, 5);
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));
    await repo.recordBalance({
      id: requestNumber(1),
      amount: pesos(20000),
      paidOn: "2026-10-25",
      note: null,
      by: "duena@example.com",
      at: new Date("2026-10-25T15:00:00.000Z"),
    });

    const cancelled = await repo.cancel(
      cancelOf(requestNumber(1), {
        amount: pesos(30000),
        refundedOn: "2026-10-26",
        note: null,
      }),
    );

    expect(cancelled.ok && cancelled.value.refund?.amount.toCentavos()).toBe(
      3_000_000,
    );
    expect(await repo.confirmedSeats(ID_A)).toBe(0);
    expect(await stock.onHand(KG)).toBe(5);
    const stored = await repo.findById(requestNumber(1));
    expect(stored?.paidAmount?.toCentavos()).toBe(1_000_000);
    expect(stored?.balance?.amount.toCentavos()).toBe(2_000_000);
  });
});

describe("balance and refund at the database", () => {
  it("records the balance in one step and refuses it twice at the same moment", async () => {
    const { repo } = await seedAllocation();
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));
    const pay = (note: string) =>
      repo.recordBalance({
        id: requestNumber(1),
        amount: pesos(20000),
        paidOn: "2026-10-25",
        note,
        by: "duena@example.com",
        at: new Date("2026-10-25T15:00:00.000Z"),
      });

    const results = await Promise.all([pay("a"), pay("b"), pay("c")]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results.filter(
        (result) => !result.ok && result.error.kind === "balance-already-paid",
      ),
    ).toHaveLength(2);
  });

  it("refuses a balance that is not what the deposit left unpaid", async () => {
    const { repo } = await seedAllocation();
    await repo.insert(pendingRequest(1));
    await repo.confirm(confirmOf(requestNumber(1)));

    await expect(
      repo.recordBalance({
        id: requestNumber(1),
        amount: pesos(19999),
        paidOn: "2026-10-25",
        note: null,
        by: "duena@example.com",
        at: WHEN,
      }),
    ).rejects.toThrow();
    expect((await repo.findById(requestNumber(1)))?.balance).toBeNull();
  });
});
