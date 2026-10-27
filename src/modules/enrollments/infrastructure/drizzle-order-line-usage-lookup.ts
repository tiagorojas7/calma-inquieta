import { inArray } from "drizzle-orm";
import { orderLine } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

type VariantIdRow = { readonly variantId: string };

export function toUsedVariantIds(
  rows: readonly VariantIdRow[],
): ReadonlySet<string> {
  return new Set(rows.map((row) => row.variantId));
}

/** Historical order-line references for the Materials usage-lookup port. */
export function createDrizzleOrderLineUsageLookup(
  openSession: DbSessionFactory,
) {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    findUsedVariantIds: (variantIds: readonly string[]) => {
      if (variantIds.length === 0) return Promise.resolve(new Set<string>());
      return withSession(async (db) => {
        const rows = await db
          .select({ variantId: orderLine.variantId })
          .from(orderLine)
          .where(inArray(orderLine.variantId, [...new Set(variantIds)]));
        return toUsedVariantIds(rows);
      });
    },
  };
}
