export * from "./application/contracts";
export { createSuppliersService } from "./application/supplier-service";
export type {
  SupplierServiceDeps,
  SupplierUseCases,
} from "./application/supplier-service";
export {
  MaterialNameConflictError,
  MaterialVariantLabelConflictError,
} from "./application/material-repository";
export type {
  MaterialFilter,
  MaterialRepository,
  MaterialWrite,
  VariantUsageLookup,
} from "./application/material-repository";
export {
  createMaterialLookup,
  createMaterialsService,
} from "./application/material-service";
export { createSaleCatalogReader } from "./application/sale-catalog";
export type {
  SaleCatalogFactsReader,
  SaleCatalogMaterialFacts,
  SaleCatalogReaderDeps,
  SaleCatalogVariantFacts,
} from "./application/sale-catalog";
export {
  createOfferedMaterialSnapshotsLookup,
  type OfferedMaterialSnapshotsLookupDeps,
} from "./application/offered-materials";
export type {
  MaterialLookupDeps,
  MaterialServiceDeps,
  MaterialUseCases,
} from "./application/material-service";
export {
  CATALOG_MAX_BYTES,
  CATALOG_MAX_ROWS,
  type CatalogFileError,
} from "./domain/catalog-csv";
export {
  materialNameKey,
  validateMaterialDraft,
  variantLabelKey,
} from "./domain/material-core";
export type {
  ValidMaterialDraft,
  ValidMaterialVariantDraft,
} from "./domain/material-core";
export { STOCK_DELTA_MAX, STOCK_REASON_MAX } from "./domain/stock-core";
export type {
  StockAdjustmentOutcome,
  StockAdjustmentWrite,
  StockStamp,
  StockStore,
  VariantStockPort,
} from "./application/stock-store";
export { SupplierNameConflictError } from "./application/supplier-repository";
export type {
  SupplierFilter,
  SupplierRepository,
} from "./application/supplier-repository";
