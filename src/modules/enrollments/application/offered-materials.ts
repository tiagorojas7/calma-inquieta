import type { Money } from "~/modules/_shared";

export interface OfferedVariant {
  readonly variantId: string;
  readonly label: string;
  /** Null means "consultar precio": never orderable. */
  readonly unitPrice: Money | null;
  readonly available: boolean;
  readonly swatch?: string | null;
}

export interface OfferedMaterialImage {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface OfferedMaterial {
  readonly materialId: string;
  readonly name: string;
  /** Product category used to group the public selector; empty when unknown. */
  readonly category?: string;
  readonly active: boolean;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly image?: OfferedMaterialImage | null;
  readonly variants: readonly OfferedVariant[];
}

/**
 * Consumer-defined port over the B9 period material offers. It returns every
 * material enabled for the period, deactivated ones included, so the service
 * can tell `material-unavailable` from `material-not-offered`.
 */
export interface OfferedMaterialsLookup {
  listForPeriod(periodId: string): Promise<readonly OfferedMaterial[]>;
}
