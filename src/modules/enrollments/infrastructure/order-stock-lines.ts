import { and, asc, eq } from "drizzle-orm";
import { orderLine } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  OrderStockPort,
  OrderStockStamp,
} from "../application/order-stock";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/** The `stock` lines of an order, by variant so concurrent orders lock stock rows in one order. */
async function stockLinesOf(tx: Db, orderId: string) {
  return tx
    .select({
      position: orderLine.position,
      variantId: orderLine.variantId,
      quantity: orderLine.quantity,
    })
    .from(orderLine)
    .where(and(eq(orderLine.orderId, orderId), eq(orderLine.source, "stock")))
    .orderBy(asc(orderLine.variantId), asc(orderLine.position));
}

/**
 * Takes the units of an order's `stock` lines inside the caller's transaction,
 * once, when the order becomes paid. A line whose stock ran out in the meantime
 * becomes a `supplier` line instead of blocking the payment: the owner arranges
 * the alternative outside the software.
 */
export async function takeStockLines(
  tx: Db,
  stock: OrderStockPort<Db>,
  orderId: string,
  stamp: OrderStockStamp,
): Promise<void> {
  for (const line of await stockLinesOf(tx, orderId)) {
    const taken = await stock.take(tx, line.variantId, line.quantity, stamp);
    if (taken) continue;
    await tx
      .update(orderLine)
      .set({ source: "supplier" })
      .where(
        and(
          eq(orderLine.orderId, orderId),
          eq(orderLine.position, line.position),
        ),
      );
  }
}

/**
 * Puts back the units of an order's `stock` lines inside the caller's
 * transaction, once, when a paid order is cancelled or goes back to pending.
 */
export async function returnStockLines(
  tx: Db,
  stock: OrderStockPort<Db>,
  orderId: string,
  stamp: OrderStockStamp,
): Promise<void> {
  for (const line of await stockLinesOf(tx, orderId))
    await stock.put(tx, line.variantId, line.quantity, stamp);
}
