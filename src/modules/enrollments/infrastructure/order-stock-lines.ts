import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { orderLine } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  OrderStockPort,
  OrderStockStamp,
} from "../application/order-stock";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/**
 * The `stock` lines of an order whose units have (`taken`) or have not left
 * the on-hand count, by variant so concurrent orders lock stock rows in one
 * order.
 */
async function stockLinesOf(tx: Db, orderId: string, taken: boolean) {
  return tx
    .select({
      position: orderLine.position,
      variantId: orderLine.variantId,
      quantity: orderLine.quantity,
    })
    .from(orderLine)
    .where(
      and(
        eq(orderLine.orderId, orderId),
        eq(orderLine.source, "stock"),
        taken
          ? isNotNull(orderLine.stockTakenAt)
          : isNull(orderLine.stockTakenAt),
      ),
    )
    .orderBy(asc(orderLine.variantId), asc(orderLine.position));
}

/**
 * Takes the units of an order's `stock` lines inside the caller's transaction,
 * when the order becomes paid, and marks each line it took. A line already
 * marked (its units were taken and handed over before a correction sent the
 * order back to pending) is left alone, so the units never leave twice. A line
 * whose stock ran out in the meantime becomes a `supplier` line instead of
 * blocking the payment: the owner arranges the alternative outside the
 * software.
 */
export async function takeStockLines(
  tx: Db,
  stock: OrderStockPort<Db>,
  orderId: string,
  stamp: OrderStockStamp,
): Promise<void> {
  for (const line of await stockLinesOf(tx, orderId, false)) {
    const taken = await stock.take(tx, line.variantId, line.quantity, stamp);
    await tx
      .update(orderLine)
      .set(taken ? { stockTakenAt: stamp.at } : { source: "supplier" })
      .where(
        and(
          eq(orderLine.orderId, orderId),
          eq(orderLine.position, line.position),
        ),
      );
  }
}

/**
 * Puts back the units of the lines that took them, inside the caller's
 * transaction, once, when a paid order is cancelled or goes back to pending,
 * and clears their mark.
 */
export async function returnStockLines(
  tx: Db,
  stock: OrderStockPort<Db>,
  orderId: string,
  stamp: OrderStockStamp,
): Promise<void> {
  for (const line of await stockLinesOf(tx, orderId, true)) {
    await stock.put(tx, line.variantId, line.quantity, stamp);
    await tx
      .update(orderLine)
      .set({ stockTakenAt: null })
      .where(
        and(
          eq(orderLine.orderId, orderId),
          eq(orderLine.position, line.position),
        ),
      );
  }
}
