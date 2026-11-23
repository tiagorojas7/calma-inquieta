import { sql } from "drizzle-orm";
import { createOrderStockAdapter } from "~/composition/order-stock-adapter";
import { createDrizzleStockStore } from "~/modules/materials/infrastructure/drizzle-stock-store";
import type { DbSessionFactory } from "~/platform/db/session";

const SEED_AT = new Date("2026-10-01T12:00:00Z");
const TEST_SUPPLIER = "5e000000-0000-4000-8000-0000000000ff";

/**
 * Stock is only kept for a variant that exists in the catalog (a stock write
 * locks its `material_variant` row). Tests of other modules use bare variant
 * ids, so this gives such an id a minimal catalog row of its own, once; a
 * variant the test already created is left as it is.
 */
export async function ensureCatalogVariant(
  openSession: DbSessionFactory,
  variantId: string,
): Promise<void> {
  const session = await openSession();
  try {
    await session.db.transaction(async (tx) => {
      const found = await tx.execute(
        sql`SELECT 1 FROM material_variant WHERE id = ${variantId}`,
      );
      if (found.rows.length > 0) return;
      await tx.execute(sql`
        INSERT INTO supplier (id, name, name_key, updated_by, updated_at)
        VALUES (${TEST_SUPPLIER}, 'Proveedor de prueba', 'proveedor de prueba',
                'test', ${SEED_AT})
        ON CONFLICT (id) DO NOTHING`);
      await tx.execute(sql`
        INSERT INTO material (id, name, name_key, description, category,
                              category_key, supplier_id, updated_by, updated_at)
        VALUES (${variantId}, ${`Material ${variantId}`},
                ${`material ${variantId}`}, 'Material de prueba', 'Prueba',
                'prueba', ${TEST_SUPPLIER}, 'test', ${SEED_AT})
        ON CONFLICT (id) DO NOTHING`);
      await tx.execute(sql`
        INSERT INTO material_variant (id, material_id, label, label_key, position)
        VALUES (${variantId}, ${variantId}, 'Única', 'unica', 0)
        ON CONFLICT (id) DO NOTHING`);
    });
  } finally {
    await session.close();
  }
}

/**
 * The real stock store on a test database, wired like composition wires it:
 * the port a paid order's transaction joins, plus `seed` and `onHand` for the
 * test to arrange and read the units. `seed` gives a bare variant id its
 * catalog row first, as the stock writes require.
 */
export function createTestOrderStock(openSession: DbSessionFactory) {
  const store = createDrizzleStockStore(openSession);
  return {
    port: createOrderStockAdapter(store),
    async seed(variantId: string, units: number): Promise<void> {
      await ensureCatalogVariant(openSession, variantId);
      const outcome = await store.adjust({
        variantId,
        delta: units,
        reason: "test seed",
        by: "test",
        at: SEED_AT,
      });
      if (outcome.kind !== "adjusted") throw new Error("stock seed refused");
    },
    /** Gives a bare variant id its catalog row without any units. */
    catalog(variantId: string): Promise<void> {
      return ensureCatalogVariant(openSession, variantId);
    },
    async onHand(variantId: string): Promise<number> {
      return (await store.onHand([variantId])).get(variantId) ?? 0;
    },
  };
}
