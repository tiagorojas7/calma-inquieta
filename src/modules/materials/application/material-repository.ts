import type { Material } from "./contracts";

export interface MaterialFilter {
  readonly state: "active" | "inactive" | "all";
  readonly category?: string;
  readonly supplierId?: string;
}

/** An active material name rejected by persistence during a concurrent write. */
export class MaterialNameConflictError extends Error {}

/** Duplicate normalized labels inside one material rejected by persistence. */
export class MaterialVariantLabelConflictError extends Error {}

/** Read-only cross-module seam for historical variant references. */
export interface VariantUsageLookup {
  findUsedVariantIds(
    variantIds: readonly string[],
  ): Promise<ReadonlySet<string>>;
}

/** One write of a batch applied by `saveAll`. */
export interface MaterialWrite {
  readonly mode: "insert" | "update";
  readonly material: Material;
}

export interface MaterialRepository {
  /** Inserts the root and every variant atomically. */
  insert(material: Material): Promise<void>;
  /** Replaces the root and complete variant list atomically. */
  update(material: Material): Promise<boolean>;
  findById(id: string): Promise<Material | null>;
  findActiveByName(name: string): Promise<Material | null>;
  /**
   * Active materials for many names in one read, keyed by the normalized name
   * key (`materialNameKey`). Names with no active material are absent.
   */
  findActiveByNames(
    names: readonly string[],
  ): Promise<ReadonlyMap<string, Material>>;
  /**
   * Applies every insert and update atomically: all land or none does. An
   * update for an unknown id fails the batch.
   */
  saveAll(writes: readonly MaterialWrite[]): Promise<void>;
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Material>>;
  /** Ordered by normalized material name, then id. */
  list(filter: MaterialFilter): Promise<readonly Material[]>;
}
