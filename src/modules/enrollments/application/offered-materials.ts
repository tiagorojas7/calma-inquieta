import type { Money } from "~/modules/_shared";

export interface OfferedVariant {
  readonly variantId: string;
  readonly label: string;
  readonly unitPrice: Money;
  readonly available: boolean;
}

export interface OfferedMaterial {
  readonly materialId: string;
  readonly name: string;
  readonly active: boolean;
  readonly supplierId: string;
  readonly supplierName: string;
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
