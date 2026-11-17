import type { RequestStockPort } from "~/modules/intensive-requests";
import type { VariantStockPort } from "~/modules/materials";

/**
 * Adapts the materials-owned variant stock to the port a workshop seat
 * request moves its project materials through when it is confirmed or
 * cancelled. `Tx` is the transaction handle both sides share; neither module
 * knows the other.
 */
export function createRequestStockAdapter<Tx>(
  stock: VariantStockPort<Tx>,
): RequestStockPort<Tx> {
  return {
    take: (tx, variantId, quantity, stamp) =>
      stock.take(tx, variantId, quantity, stamp),
    put: (tx, variantId, quantity, stamp) =>
      stock.put(tx, variantId, quantity, stamp),
  };
}
