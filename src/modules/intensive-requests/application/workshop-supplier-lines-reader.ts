/**
 * A material line of a confirmed workshop request that the studio's stock
 * could not cover (`source = supplier`) and that was not marked as ordered
 * yet: the owner still has to buy it.
 */
export interface WorkshopSupplierLineRow {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly supplierId: string;
  /** Frozen on the line when the seat was confirmed. */
  readonly supplierName: string;
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
  /** The supplier cost frozen on the line; null when none was loaded. */
  readonly unitCostCentavos: number | null;
  /** Who the units are for, for the owner's screen only. */
  readonly studentName: string;
  /** The project she chose; null for a request made before projects. */
  readonly projectName: string | null;
}

/** What the supplier purchase list reads and marks about workshops. */
export interface WorkshopSupplierLinesReader {
  /** Lines still to order of the confirmed requests of the workshops held in `YYYY-MM`. */
  lines(period: string): Promise<readonly WorkshopSupplierLineRow[]>;
  /**
   * Marks as ordered, atomically, the lines still to order that one supplier
   * owes a workshop (the owner placed that order). Returns how many lines
   * were marked: 0 when pressed again, so it is safe to repeat. A request
   * confirmed afterwards brings new lines, not yet ordered. A cancel of a
   * request whose lines were ordered puts their units into the studio stock.
   */
  markOrdered(workshopId: string, supplierId: string): Promise<number>;
}
