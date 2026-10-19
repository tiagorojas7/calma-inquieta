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

export interface MaterialRepository {
  /** Inserts the root and every variant atomically. */
  insert(material: Material): Promise<void>;
  /** Replaces the root and complete variant list atomically. */
  update(material: Material): Promise<boolean>;
  findById(id: string): Promise<Material | null>;
  findActiveByName(name: string): Promise<Material | null>;
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Material>>;
  /** Ordered by normalized material name, then id. */
  list(filter: MaterialFilter): Promise<readonly Material[]>;
}
