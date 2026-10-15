import type { AdminActor } from "~/modules/admin-access";
import type {
  AdminFailure,
  Audit,
  Invalid,
  NotFound,
  Result,
} from "~/modules/_shared";
import type { ImageUse, ImageUseDraft } from "~/modules/media";
import type { SupplierDraft, SupplierField } from "../domain/supplier-core";

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
  readonly price: import("~/modules/_shared").Money;
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
  readonly category: string;
  readonly supplierName: string;
  readonly variantCount: number;
  readonly active: boolean;
  readonly available: boolean;
}
export interface MaterialDraft {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly supplierId: string;
  readonly available: boolean;
  readonly image: ImageUseDraft | null;
  readonly variants: readonly {
    readonly id?: string;
    readonly label: string;
    readonly price: string;
    readonly available: boolean;
    readonly swatch: string;
  }[];
}
export type MaterialField =
  "name" | "description" | "category" | "supplierId" | "image" | "variants";
export type MaterialError =
  Invalid<MaterialField> | { readonly kind: "variant-in-use" };
export interface MaterialLookup {
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Material>>;
}
export interface MaterialsService {
  list(
    a: AdminActor,
    f: {
      readonly state: "active" | "inactive" | "all";
      readonly category?: string;
      readonly supplierId?: string;
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
  ): Promise<Result<Material, AdminFailure | NotFound>>;
  categorySuggestions(
    a: AdminActor,
  ): Promise<Result<readonly string[], AdminFailure>>;
}
