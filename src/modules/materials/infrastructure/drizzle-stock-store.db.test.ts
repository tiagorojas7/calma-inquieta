import { asc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { createMaterialsService } from "~/modules/materials";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  stockAdjustment,
  supplier,
  variantStock,
} from "~/platform/db/schema/materials";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import {
  buildStoredMaterial,
  buildStoredVariant,
  MATERIAL_ASSET_ID,
  MATERIAL_SUPPLIER_ID,
} from "~/testing/contracts/material-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleMaterialRepository } from "./drizzle-material-repository";
import { createDrizzleStockStore } from "./drizzle-stock-store";
import { createDrizzleSupplierRepository } from "./drizzle-supplier-repository";
import { MissingStockVariantError } from "./stock-claim";

const created: TestDatabase[] = [];
const AT = new Date("2026-11-16T12:00:00.000Z");
const BY = "owner@example.com";
const VARIANT = "00000000-0000-4000-8000-0000000000a1";
const unusedVariants = {
  findUsedVariantIds: (): Promise<ReadonlySet<string>> =>
    Promise.resolve(new Set()),
};

afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function fresh(seedCatalog = true) {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  if (seedCatalog) {
    const seed = await openSession();
    try {
      await seed.db.insert(supplier).values({
        id: MATERIAL_SUPPLIER_ID,
        name: "Proveedor",
        nameKey: "proveedor",
        active: true,
        updatedBy: BY,
        updatedAt: AT,
      });
    } finally {
      await seed.close();
    }
    const repository = createDrizzleMaterialRepository(
      openSession,
      unusedVariants,
    );
    await repository.insert(
      buildStoredMaterial({
        image: null,
        variants: [
          buildStoredVariant({ id: VARIANT }),
          buildStoredVariant({
            id: "00000000-0000-4000-8000-0000000000a2",
            label: "Otra",
            position: 1,
          }),
        ],
      }),
    );
  }
  const store = createDrizzleStockStore(openSession);
  /** Runs `run` inside one transaction, as the enrollments store will. */
  async function inTransaction<T>(
    run: (tx: Parameters<typeof store.take>[0]) => Promise<T>,
  ): Promise<T> {
    const session = await openSession();
    try {
      return await session.db.transaction((tx) => run(tx));
    } finally {
      await session.close();
    }
  }
  async function snapshot() {
    const session = await openSession();
    try {
      return {
        stock: await session.db
          .select()
          .from(variantStock)
          .orderBy(asc(variantStock.variantId)),
        audit: await session.db
          .select()
          .from(stockAdjustment)
          .orderBy(asc(stockAdjustment.at), asc(stockAdjustment.id)),
      };
    } finally {
      await session.close();
    }
  }
  return { database, openSession, store, inTransaction, snapshot };
}

const adjust = (
  store: Awaited<ReturnType<typeof fresh>>["store"],
  delta: number,
  reason = "Compra",
  variantId = VARIANT,
  at = AT,
) => store.adjust({ variantId, delta, reason, by: BY, at });

describe("Drizzle stock store", () => {
  it("reads 0 for a variant without a stock row and the count for the others", async () => {
    const { store } = await fresh();
    const other = "00000000-0000-4000-8000-0000000000a2";
    await adjust(store, 4, "Compra", other);

    expect(await store.onHand([VARIANT, other])).toEqual(
      new Map([
        [VARIANT, 0],
        [other, 4],
      ]),
    );
    expect(await store.onHand([])).toEqual(new Map());
  });

  it("adds and subtracts with one audit row each", async () => {
    const { store, snapshot } = await fresh();

    expect(await adjust(store, 5, "Compra al proveedor")).toEqual({
      kind: "adjusted",
      onHand: 5,
    });
    const later = new Date(AT.getTime() + 1000);
    expect(await adjust(store, -2, "Rotura", VARIANT, later)).toEqual({
      kind: "adjusted",
      onHand: 3,
    });

    const { stock, audit } = await snapshot();
    expect(stock).toEqual([
      { variantId: VARIANT, onHand: 3, updatedAt: later, updatedBy: BY },
    ]);
    expect(audit).toMatchObject([
      { variantId: VARIANT, delta: 5, reason: "Compra al proveedor", by: BY },
      { variantId: VARIANT, delta: -2, reason: "Rotura", by: BY },
    ]);
  });

  it("refuses an adjustment that would go below zero and leaves everything unchanged", async () => {
    const { store, snapshot } = await fresh();
    await adjust(store, 2);
    const before = await snapshot();

    expect(await adjust(store, -3, "Rotura")).toEqual({
      kind: "insufficient",
      onHand: 2,
    });
    expect(await snapshot()).toEqual(before);

    const unknown = "00000000-0000-4000-8000-0000000000a3";
    expect(await adjust(store, -1, "Rotura", unknown)).toEqual({
      kind: "missing",
    });
    expect(await snapshot()).toEqual(before);
  });

  it("take refuses insufficient stock without changing the count", async () => {
    const { store, inTransaction, snapshot } = await fresh();
    await adjust(store, 2);
    const before = await snapshot();
    const stamp = { by: BY, at: AT };

    expect(await inTransaction((tx) => store.take(tx, VARIANT, 3, stamp))).toBe(
      false,
    );
    expect(
      await inTransaction((tx) =>
        store.take(tx, "00000000-0000-4000-8000-0000000000a4", 1, stamp),
      ),
    ).toBe(false);
    expect(await snapshot()).toEqual(before);
    expect(await inTransaction((tx) => store.take(tx, VARIANT, 2, stamp))).toBe(
      true,
    );
    expect(await store.onHand([VARIANT])).toEqual(new Map([[VARIANT, 0]]));
  });

  it("put adds units, creating the row on first use, and rolls back with the caller's transaction", async () => {
    const { store, inTransaction } = await fresh();
    const stamp = { by: BY, at: AT };

    await inTransaction((tx) => store.put(tx, VARIANT, 2, stamp));
    await inTransaction((tx) => store.put(tx, VARIANT, 3, stamp));
    expect(await store.onHand([VARIANT])).toEqual(new Map([[VARIANT, 5]]));

    await expect(
      inTransaction(async (tx) => {
        await store.take(tx, VARIANT, 4, stamp);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(await store.onHand([VARIANT])).toEqual(new Map([[VARIANT, 5]]));
  });

  it("refuses a put for a deleted variant before creating any stock row", async () => {
    const { store, inTransaction, snapshot } = await fresh();
    const missing = crypto.randomUUID();
    await expect(
      inTransaction((tx) => store.put(tx, missing, 2, { by: BY, at: AT })),
    ).rejects.toBeInstanceOf(MissingStockVariantError);
    expect(await snapshot()).toEqual({ stock: [], audit: [] });
  });

  it("rejects a non-positive or fractional quantity", async () => {
    const { store, inTransaction } = await fresh();
    const stamp = { by: BY, at: AT };
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      await expect(
        inTransaction((tx) => store.take(tx, VARIANT, quantity, stamp)),
      ).rejects.toThrow(RangeError);
      await expect(
        inTransaction((tx) => store.put(tx, VARIANT, quantity, stamp)),
      ).rejects.toThrow(RangeError);
    }
  });

  it("gives exactly K successes to N concurrent takes against K units", async () => {
    const { store, inTransaction } = await fresh();
    await adjust(store, 3);
    const stamp = { by: BY, at: AT };

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        inTransaction((tx) => store.take(tx, VARIANT, 1, stamp)),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await store.onHand([VARIANT])).toEqual(new Map([[VARIANT, 0]]));
  });

  it("gives exactly K successes to concurrent manual subtractions too", async () => {
    const { store, snapshot } = await fresh();
    await adjust(store, 2);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => adjust(store, -1, "Rotura")),
    );

    expect(results.filter((result) => result.kind === "adjusted")).toHaveLength(
      2,
    );
    const { stock, audit } = await snapshot();
    expect(stock[0]?.onHand).toBe(0);
    expect(audit).toHaveLength(3);
  });

  it("enforces the database checks", async () => {
    const { openSession } = await fresh();
    const session = await openSession();
    try {
      await expect(
        session.db.insert(variantStock).values({
          variantId: VARIANT,
          onHand: -1,
          updatedAt: AT,
          updatedBy: BY,
        }),
      ).rejects.toThrow();
      await expect(
        session.db.insert(stockAdjustment).values({
          id: crypto.randomUUID(),
          variantId: VARIANT,
          delta: 0,
          reason: "Compra",
          at: AT,
          by: BY,
        }),
      ).rejects.toThrow();
      await expect(
        session.db.insert(stockAdjustment).values({
          id: crypto.randomUUID(),
          variantId: VARIANT,
          delta: 1,
          reason: "   ",
          at: AT,
          by: BY,
        }),
      ).rejects.toThrow();
    } finally {
      await session.close();
    }
  });
});

describe("stock survives the catalog writes that replace variant rows", () => {
  it("keeps the count across a material save, a CSV import and a price raise", async () => {
    const { openSession, store } = await fresh(false);
    const session = await openSession();
    try {
      await session.db.insert(supplier).values({
        id: MATERIAL_SUPPLIER_ID,
        name: "Proveedor",
        nameKey: "proveedor",
        active: true,
        updatedBy: BY,
        updatedAt: AT,
      });
      await session.db.execute(
        sql`INSERT INTO media_asset
              (id, storage_key, content_type, byte_size, width, height, created_by, created_at)
            VALUES
              (${MATERIAL_ASSET_ID}, 'material.jpg', 'image/jpeg', 100, 10, 10, ${BY}, ${AT})`,
      );
    } finally {
      await session.close();
    }
    const cost = Money.fromCentavos(60_000);
    if (!cost.ok) throw new Error("expected cost");
    const repository = createDrizzleMaterialRepository(
      openSession,
      unusedVariants,
    );
    const seeded = buildStoredMaterial({
      variants: [buildStoredVariant({ id: VARIANT, cost: cost.value })],
    });
    await repository.insert(seeded);
    await adjust(store, 7);
    const service = createMaterialsService({
      repository,
      suppliers: createDrizzleSupplierRepository(openSession),
      media: { findAssets: () => Promise.resolve(new Map()) },
      clock: advancingClock(AT),
      stock: store,
    });
    const actor = testAdminActor(BY);

    const saved = await service.update(actor, seeded.id, {
      name: "Ámbar",
      description: "Material de prueba",
      category: "Arcillas",
      supplierId: seeded.supplier.id,
      available: true,
      image: null,
      variants: [
        {
          id: VARIANT,
          label: "Única",
          price: "1500",
          cost: "700",
          available: true,
          swatch: "",
        },
      ],
    });
    expect(saved.ok).toBe(true);
    await service.raisePrices(actor, { supplierId: seeded.supplier.id }, 10);
    const imported = await service.importCatalog(
      actor,
      seeded.supplier.id,
      "Categoría;Producto;Medida;Precio\nArcillas;Ámbar;Única;1800\n",
    );
    expect(imported.ok).toBe(true);

    const after = await repository.findById(seeded.id);
    expect(after?.variants.map((variant) => variant.id)).toEqual([VARIANT]);
    expect(after?.variants[0]?.cost?.toCentavos()).toBe(70_000);
    expect(after?.variants[0]?.price?.toCentavos()).toBe(180_000);
    expect(await store.onHand([VARIANT])).toEqual(new Map([[VARIANT, 7]]));

    const check = await openSession();
    try {
      const rows = await check.db
        .select()
        .from(variantStock)
        .where(eq(variantStock.variantId, VARIANT));
      expect(rows).toHaveLength(1);
    } finally {
      await check.close();
    }
  });
});
