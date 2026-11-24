import type { OrderStockPort } from "~/modules/enrollments";
import type { VariantStockPort } from "~/modules/materials";

/**
 * Adapts the materials-owned variant stock to the port a paid order's
 * transaction takes and returns its units through. `Tx` is the transaction
 * handle both sides share; neither module knows the other.
 */
export function createOrderStockAdapter<Tx>(
  stock: VariantStockPort<Tx>,
): OrderStockPort<Tx> {
  return {
    take: (tx, variantId, quantity, stamp) =>
      stock.take(tx, variantId, quantity, stamp),
    put: (tx, variantId, quantity, stamp) =>
      stock.put(tx, variantId, quantity, stamp),
  };
}
