/** Who moved the stock and when; the stock row keeps it. */
export interface OrderStockStamp {
  readonly by: string;
  readonly at: Date;
}

/**
 * The stock movements a paid order makes, consumer-defined. They join the
 * caller's transaction (`Tx` is that transaction handle, opaque here), so the
 * units move in the same transaction that pays or cancels the order: both land
 * or neither does. Composition adapts the materials stock to this port.
 */
export interface OrderStockPort<Tx> {
  /**
   * Removes `quantity` units only while at least that many remain. Resolves
   * true when taken and false when the stock is insufficient (nothing changed).
   */
  take(
    tx: Tx,
    variantId: string,
    quantity: number,
    stamp: OrderStockStamp,
  ): Promise<boolean>;
  /** Adds `quantity` units back. */
  put(
    tx: Tx,
    variantId: string,
    quantity: number,
    stamp: OrderStockStamp,
  ): Promise<void>;
}
