/** One signed change to a variant's on-hand units, with who and when. */
export interface StockAdjustmentWrite {
  readonly variantId: string;
  /** Non-zero whole units. */
  readonly delta: number;
  readonly reason: string;
  readonly by: string;
  readonly at: Date;
}

export type StockAdjustmentOutcome =
  | { readonly kind: "adjusted"; readonly onHand: number }
  /** The change would leave fewer than 0 units; nothing was written. */
  | { readonly kind: "insufficient"; readonly onHand: number };

/** On-hand units per variant and the audited manual adjustment. */
export interface StockStore {
  /** Units per variant id; a variant without a stock row reads 0. */
  onHand(variantIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
  /**
   * Applies the delta and writes one audit row atomically, or refuses with
   * `insufficient` when the result would be negative (nothing is written).
   */
  adjust(write: StockAdjustmentWrite): Promise<StockAdjustmentOutcome>;
}

/** Who moved the stock and when; stored on the stock row. */
export interface StockStamp {
  readonly by: string;
  readonly at: Date;
}

/**
 * Stock movement that joins a caller's transaction: the enrollments flows that
 * confirm, cancel or correct a paid order take and return units in the same
 * transaction that changes the order, so both land or neither does. `Tx` is
 * the caller's transaction handle, opaque to this module; composition binds it
 * (`createDrizzleVariantStock`), and the adapter lives in the caller's layer.
 */
export interface VariantStockPort<Tx> {
  /** Units per variant id, outside any transaction; a missing row reads 0. */
  onHand(variantIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
  /**
   * Removes `quantity` units only while at least that many remain. Resolves
   * true when taken, false when stock is insufficient (nothing changed).
   * `quantity` must be a positive whole number or it throws a RangeError.
   */
  take(
    tx: Tx,
    variantId: string,
    quantity: number,
    stamp: StockStamp,
  ): Promise<boolean>;
  /** Adds `quantity` units, creating the stock row on first use. */
  put(
    tx: Tx,
    variantId: string,
    quantity: number,
    stamp: StockStamp,
  ): Promise<void>;
}
