import { createOrderStockAdapter } from "~/composition/order-stock-adapter";
import { createDrizzleStockStore } from "~/modules/materials/infrastructure/drizzle-stock-store";
import type { DbSessionFactory } from "~/platform/db/session";

const SEED_AT = new Date("2026-10-01T12:00:00Z");

/**
 * The real stock store on a test database, wired like composition wires it:
 * the port a paid order's transaction joins, plus `seed` and `onHand` for the
 * test to arrange and read the units.
 */
export function createTestOrderStock(openSession: DbSessionFactory) {
  const store = createDrizzleStockStore(openSession);
  return {
    port: createOrderStockAdapter(store),
    async seed(variantId: string, units: number): Promise<void> {
      const outcome = await store.adjust({
        variantId,
        delta: units,
        reason: "test seed",
        by: "test",
        at: SEED_AT,
      });
      if (outcome.kind !== "adjusted") throw new Error("stock seed refused");
    },
    async onHand(variantId: string): Promise<number> {
      return (await store.onHand([variantId])).get(variantId) ?? 0;
    },
  };
}
