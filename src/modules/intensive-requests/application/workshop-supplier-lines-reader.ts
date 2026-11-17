/**
 * A material line of a confirmed workshop request that the studio's stock
 * could not cover (`source = supplier`): the owner has to buy it.
 */
export interface WorkshopSupplierLineRow {
  readonly workshopName: string;
  readonly supplierId: string;
  /** Frozen on the line when the seat was confirmed. */
  readonly supplierName: string;
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
  /** The supplier cost frozen on the line; null when none was loaded. */
  readonly unitCostCentavos: number | null;
}

/** What the supplier purchase list reads about workshops. */
export interface WorkshopSupplierLinesReader {
  /** Lines of the confirmed requests of the workshops held in `YYYY-MM`. */
  lines(period: string): Promise<readonly WorkshopSupplierLineRow[]>;
}
