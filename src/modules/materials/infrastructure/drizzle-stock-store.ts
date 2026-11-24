import { inArray } from "drizzle-orm";
import { variantStock } from "~/platform/db/schema/materials";
import type { DbSessionFactory } from "~/platform/db/session";
import type { StockStore, VariantStockPort } from "../application/stock-store";
import { adjustStock, putStock, takeStock } from "./stock-claim";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/**
 * Stock persistence on short-lived sessions. `take` and `put` run on the
 * caller's transaction (`Db` is that transaction handle); the rest opens its
 * own session. The stock rows have no foreign key to the variants, so saving a
 * material (which replaces its variant rows) never touches them.
 */
export function createDrizzleStockStore(
  openSession: DbSessionFactory,
): StockStore & VariantStockPort<Db> {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    onHand: (variantIds) =>
      withSession(async (db) => {
        const ids = [...new Set(variantIds)];
        const levels = new Map(ids.map((id) => [id, 0]));
        if (ids.length === 0) return levels;
        const rows = await db
          .select({
            variantId: variantStock.variantId,
            onHand: variantStock.onHand,
          })
          .from(variantStock)
          .where(inArray(variantStock.variantId, ids));
        for (const row of rows) levels.set(row.variantId, row.onHand);
        return levels;
      }),

    adjust: (write) =>
      withSession((db) => db.transaction((tx) => adjustStock(tx, write))),

    take: (tx, variantId, quantity, stamp) =>
      takeStock(tx, variantId, quantity, stamp),

    async put(tx, variantId, quantity, stamp) {
      await putStock(tx, variantId, quantity, stamp);
    },
  };
}
