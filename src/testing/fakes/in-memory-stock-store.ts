import type {
  StockAdjustmentOutcome,
  StockAdjustmentWrite,
  StockStore,
  VariantStockPort,
} from "~/modules/materials";

/**
 * Stock in memory with the PostgreSQL semantics: a variant without a row reads
 * 0, an adjustment below zero writes nothing, `take` is guarded. The
 * transaction handle of the port is ignored; there is nothing to roll back.
 */
export class InMemoryStockStore
  implements StockStore, VariantStockPort<unknown>
{
  readonly levels = new Map<string, number>();
  readonly adjustments: StockAdjustmentWrite[] = [];

  onHand(variantIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    return Promise.resolve(
      new Map(variantIds.map((id) => [id, this.levels.get(id) ?? 0])),
    );
  }

  adjust(write: StockAdjustmentWrite): Promise<StockAdjustmentOutcome> {
    const current = this.levels.get(write.variantId) ?? 0;
    if (current + write.delta < 0)
      return Promise.resolve({ kind: "insufficient", onHand: current });
    this.levels.set(write.variantId, current + write.delta);
    this.adjustments.push(write);
    return Promise.resolve({ kind: "adjusted", onHand: current + write.delta });
  }

  take(_tx: unknown, variantId: string, quantity: number): Promise<boolean> {
    assertQuantity(quantity);
    const current = this.levels.get(variantId) ?? 0;
    if (current < quantity) return Promise.resolve(false);
    this.levels.set(variantId, current - quantity);
    return Promise.resolve(true);
  }

  put(_tx: unknown, variantId: string, quantity: number): Promise<void> {
    assertQuantity(quantity);
    this.levels.set(variantId, (this.levels.get(variantId) ?? 0) + quantity);
    return Promise.resolve();
  }
}

function assertQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new RangeError("stock quantity must be a positive whole number");
}
