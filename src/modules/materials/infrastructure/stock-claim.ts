import { and, eq, sql } from "drizzle-orm";
import { stockAdjustment, variantStock } from "~/platform/db/schema/materials";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  StockAdjustmentOutcome,
  StockAdjustmentWrite,
  StockStamp,
} from "../application/stock-store";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

export class MissingStockVariantError extends Error {}

/** Hold the catalog row until the surrounding stock transaction commits. */
async function lockVariant(tx: Db, variantId: string): Promise<boolean> {
  const found = await tx.execute<{ id: string }>(sql`
    SELECT id FROM material_variant WHERE id = ${variantId} FOR KEY SHARE`);
  return found.rows.length > 0;
}

function assertQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new RangeError("stock quantity must be a positive whole number");
}

/**
 * Removes `quantity` units inside the caller's transaction, only while that
 * many remain: a guarded conditional update, so concurrent takes serialize on
 * the row and never drive the count below zero. Resolves false (and changes
 * nothing) when stock is insufficient or the variant has no stock row.
 */
export async function takeStock(
  tx: Db,
  variantId: string,
  quantity: number,
  stamp: StockStamp,
): Promise<boolean> {
  assertQuantity(quantity);
  const taken = await tx
    .update(variantStock)
    .set({
      onHand: sql`${variantStock.onHand} - ${quantity}`,
      updatedAt: stamp.at,
      updatedBy: stamp.by,
    })
    .where(
      and(
        eq(variantStock.variantId, variantId),
        sql`${variantStock.onHand} >= ${quantity}`,
      ),
    )
    .returning({ onHand: variantStock.onHand });
  return taken.length > 0;
}

/** Adds `quantity` units inside the caller's transaction, creating the row. */
export async function putStock(
  tx: Db,
  variantId: string,
  quantity: number,
  stamp: StockStamp,
): Promise<number> {
  assertQuantity(quantity);
  if (!(await lockVariant(tx, variantId))) throw new MissingStockVariantError();
  const [row] = await tx
    .insert(variantStock)
    .values({
      variantId,
      onHand: quantity,
      updatedAt: stamp.at,
      updatedBy: stamp.by,
    })
    .onConflictDoUpdate({
      target: variantStock.variantId,
      set: {
        onHand: sql`${variantStock.onHand} + ${quantity}`,
        updatedAt: stamp.at,
        updatedBy: stamp.by,
      },
    })
    .returning({ onHand: variantStock.onHand });
  if (!row) throw new Error("stock row was not written");
  return row.onHand;
}

/**
 * One manual adjustment on the caller's transaction: moves the count and
 * writes the audit row, or refuses (writing nothing) when the count would go
 * below zero.
 */
export async function adjustStock(
  tx: Db,
  write: StockAdjustmentWrite,
): Promise<StockAdjustmentOutcome> {
  if (!(await lockVariant(tx, write.variantId))) return { kind: "missing" };
  const stamp = { by: write.by, at: write.at };
  let onHand: number | null;
  if (write.delta > 0) {
    onHand = await putStock(tx, write.variantId, write.delta, stamp);
  } else {
    const removed = -write.delta;
    assertQuantity(removed);
    const [row] = await tx
      .update(variantStock)
      .set({
        onHand: sql`${variantStock.onHand} - ${removed}`,
        updatedAt: write.at,
        updatedBy: write.by,
      })
      .where(
        and(
          eq(variantStock.variantId, write.variantId),
          sql`${variantStock.onHand} >= ${removed}`,
        ),
      )
      .returning({ onHand: variantStock.onHand });
    onHand = row?.onHand ?? null;
  }
  if (onHand === null) {
    const [current] = await tx
      .select({ onHand: variantStock.onHand })
      .from(variantStock)
      .where(eq(variantStock.variantId, write.variantId));
    return { kind: "insufficient", onHand: current?.onHand ?? 0 };
  }
  await tx.insert(stockAdjustment).values({
    id: crypto.randomUUID(),
    variantId: write.variantId,
    delta: write.delta,
    reason: write.reason,
    at: write.at,
    by: write.by,
  });
  return { kind: "adjusted", onHand };
}
