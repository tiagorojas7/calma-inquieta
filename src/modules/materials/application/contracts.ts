import type { AdminActor } from "~/modules/admin-access";
import type {
  AdminFailure,
  Audit,
  Invalid,
  NotFound,
  Result,
} from "~/modules/_shared";
import type { ImageUse } from "~/modules/media";
import type { CatalogFileError, CatalogRowCode } from "../domain/catalog-csv";
import type { MaterialDraft, MaterialField } from "../domain/material-core";
import type { SupplierDraft, SupplierField } from "../domain/supplier-core";

export type { MaterialDraft, MaterialField } from "../domain/material-core";
export type { SupplierDraft, SupplierField } from "../domain/supplier-core";

export const DEFAULT_VARIANT_LABEL = "Única";
export interface Supplier {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly active: boolean;
  readonly audit: Audit;
}
export interface SuppliersService {
  list(
    a: AdminActor,
    f?: { readonly active?: boolean },
  ): Promise<Result<readonly Supplier[], AdminFailure>>;
  get(
    a: AdminActor,
    id: string,
  ): Promise<Result<Supplier, AdminFailure | NotFound>>;
  create(
    a: AdminActor,
    d: SupplierDraft,
  ): Promise<Result<Supplier, AdminFailure | Invalid<SupplierField>>>;
  update(
    a: AdminActor,
    id: string,
    d: SupplierDraft,
  ): Promise<
    Result<Supplier, AdminFailure | NotFound | Invalid<SupplierField>>
  >;
  archive(
    a: AdminActor,
    id: string,
  ): Promise<Result<Supplier, AdminFailure | NotFound>>;
  reactivate(
    a: AdminActor,
    id: string,
  ): Promise<Result<Supplier, AdminFailure | NotFound | Invalid<"name">>>;
}
export interface MaterialVariant {
  readonly id: string;
  readonly label: string;
  /** Null means "consultar precio". */
  readonly price: import("~/modules/_shared").Money | null;
  readonly available: boolean;
  readonly used: boolean;
  readonly position: number;
  readonly swatch: string | null;
}
export interface Material {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly supplier: Supplier;
  readonly available: boolean;
  readonly active: boolean;
  readonly image: ImageUse | null;
  readonly variants: readonly MaterialVariant[];
  readonly audit: Audit;
}
export interface MaterialSummary {
  readonly id: string;
  readonly name: string;
  readonly hasImage: boolean;
  readonly category: string;
  readonly supplierName: string;
  readonly variantCount: number;
  readonly active: boolean;
  readonly available: boolean;
}
export type MaterialError =
  Invalid<MaterialField> | { readonly kind: "variant-in-use" };
export type CatalogImportIssueCode = CatalogRowCode | "other-supplier";
export interface CatalogImportIssue {
  readonly line: number;
  readonly code: CatalogImportIssueCode;
}
export interface CatalogImportItem {
  readonly line: number;
  readonly product: string;
  readonly measure: string;
  readonly kind: "new-material" | "new-variant" | "price-change" | "unchanged";
  /** Whole pesos; null means "consultar precio" or no previous variant. */
  readonly from: number | null;
  readonly to: number | null;
}
export interface CatalogImportPlan {
  readonly supplierName: string;
  readonly rowCount: number;
  readonly newMaterials: number;
  readonly newVariants: number;
  readonly priceChanges: number;
  readonly unchanged: number;
  readonly errors: readonly CatalogImportIssue[];
  readonly items: readonly CatalogImportItem[];
}
export type CatalogImportError =
  | NotFound
  | Invalid<"supplierId">
  | { readonly kind: "file"; readonly reason: CatalogFileError }
  | { readonly kind: "has-errors" };
export interface PriceRaiseScope {
  readonly supplierId?: string;
  readonly category?: string;
}
export interface PriceRaisePlan {
  readonly percent: number;
  readonly materialCount: number;
  readonly variantCount: number;
  readonly skippedWithoutPrice: number;
  /** Sum of the affected variant prices, in whole pesos. */
  readonly beforeTotal: number;
  readonly afterTotal: number;
  readonly changes: readonly {
    readonly materialId: string;
    readonly name: string;
    readonly variants: readonly {
      readonly label: string;
      readonly from: number;
      readonly to: number;
    }[];
  }[];
}
export type PriceRaiseError =
  { readonly kind: "invalid-percent" } | { readonly kind: "no-scope" };
export interface MaterialLookup {
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Material>>;
}
export interface OfferedMaterialSnapshot {
  readonly materialId: string;
  readonly name: string;
  readonly category: string;
  readonly active: boolean;
  readonly available: boolean;
  readonly supplierId: string;
  readonly supplierName: string;
  /** Public asset projection; null when unset or the asset no longer exists. */
  readonly image: {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  } | null;
  readonly variants: readonly {
    readonly variantId: string;
    readonly label: string;
    /** Null means "consultar precio": never orderable. */
    readonly unitPrice: import("~/modules/_shared").Money | null;
    readonly available: boolean;
    readonly swatch: string | null;
  }[];
}
/** Actorless current-sale read for enrollment composition. */
export interface OfferedMaterialSnapshotsLookup {
  findOfferedMaterialSnapshots(
    materialIds: readonly string[],
  ): Promise<ReadonlyMap<string, OfferedMaterialSnapshot>>;
}
export interface MaterialsService {
  list(
    a: AdminActor,
    f: {
      readonly state: "active" | "inactive" | "all";
      readonly category?: string;
      readonly supplierId?: string;
      readonly withoutImage?: boolean;
    },
  ): Promise<Result<readonly MaterialSummary[], AdminFailure>>;
  listSelectable(
    a: AdminActor,
  ): Promise<Result<readonly MaterialSummary[], AdminFailure>>;
  get(
    a: AdminActor,
    id: string,
  ): Promise<Result<Material, AdminFailure | NotFound>>;
  create(
    a: AdminActor,
    d: MaterialDraft,
  ): Promise<Result<Material, AdminFailure | MaterialError>>;
  update(
    a: AdminActor,
    id: string,
    d: MaterialDraft,
  ): Promise<Result<Material, AdminFailure | NotFound | MaterialError>>;
  deactivate(
    a: AdminActor,
    id: string,
  ): Promise<Result<Material, AdminFailure | NotFound>>;
  reactivate(
    a: AdminActor,
    id: string,
  ): Promise<Result<Material, AdminFailure | NotFound | Invalid<"name">>>;
  categorySuggestions(
    a: AdminActor,
  ): Promise<Result<readonly string[], AdminFailure>>;
  setImage(
    a: AdminActor,
    id: string,
    image: { readonly assetId: string; readonly alt: string },
  ): Promise<Result<Material, AdminFailure | NotFound | Invalid<"image">>>;
  previewCatalogImport(
    a: AdminActor,
    supplierId: string,
    csv: string,
  ): Promise<Result<CatalogImportPlan, AdminFailure | CatalogImportError>>;
  importCatalog(
    a: AdminActor,
    supplierId: string,
    csv: string,
  ): Promise<Result<CatalogImportPlan, AdminFailure | CatalogImportError>>;
  previewPriceRaise(
    a: AdminActor,
    scope: PriceRaiseScope,
    percent: number,
  ): Promise<Result<PriceRaisePlan, AdminFailure | PriceRaiseError>>;
  raisePrices(
    a: AdminActor,
    scope: PriceRaiseScope,
    percent: number,
  ): Promise<Result<PriceRaisePlan, AdminFailure | PriceRaiseError>>;
}
