import type { Supplier } from "./contracts";

export type SupplierFilter = "active" | "archived" | "all";

/** A duplicate active supplier name rejected by a persistence implementation. */
export class SupplierNameConflictError extends Error {}

/**
 * Persistence port for suppliers. A second ACTIVE supplier whose name matches
 * case-insensitively is a unique violation: implementations reject the write
 * (the use cases check first; this is the race-proof backstop).
 */
export interface SupplierRepository {
  /** Rejects on a duplicate id or SupplierNameConflictError for an active name. */
  insert(supplier: Supplier): Promise<void>;
  /** Replaces every field. Returns false when the id is unknown. Rejects on SupplierNameConflictError for an active name. */
  update(supplier: Supplier): Promise<boolean>;
  findById(id: string): Promise<Supplier | null>;
  /** Case-insensitive match among ACTIVE suppliers only. */
  findActiveByName(name: string): Promise<Supplier | null>;
  /** Ordered by name (case-insensitive), then id. */
  list(filter: SupplierFilter): Promise<readonly Supplier[]>;
}
