import { supplierNameKey } from "~/modules/materials/domain/supplier-core";
import type { Supplier } from "~/modules/materials";
import {
  SupplierNameConflictError,
  type SupplierFilter,
  type SupplierRepository,
} from "~/modules/materials";

/** Suppliers in memory, enforcing the same constraints as the database. */
export class InMemorySupplierRepository implements SupplierRepository {
  readonly suppliers = new Map<string, Supplier>();

  private nameTakenByAnother(candidate: Supplier): boolean {
    if (!candidate.active) return false;
    const key = supplierNameKey(candidate.name);
    return [...this.suppliers.values()].some(
      (stored) =>
        stored.id !== candidate.id &&
        stored.active &&
        supplierNameKey(stored.name) === key,
    );
  }

  insert(supplier: Supplier): Promise<void> {
    if (this.suppliers.has(supplier.id))
      return Promise.reject(new Error("supplier already exists"));
    if (this.nameTakenByAnother(supplier))
      return Promise.reject(new SupplierNameConflictError());
    this.suppliers.set(supplier.id, supplier);
    return Promise.resolve();
  }

  update(supplier: Supplier): Promise<boolean> {
    if (!this.suppliers.has(supplier.id)) return Promise.resolve(false);
    if (this.nameTakenByAnother(supplier))
      return Promise.reject(new SupplierNameConflictError());
    this.suppliers.set(supplier.id, supplier);
    return Promise.resolve(true);
  }

  findById(id: string): Promise<Supplier | null> {
    return Promise.resolve(this.suppliers.get(id) ?? null);
  }

  findActiveByName(name: string): Promise<Supplier | null> {
    const key = supplierNameKey(name);
    const match = [...this.suppliers.values()].find(
      (stored) => stored.active && supplierNameKey(stored.name) === key,
    );
    return Promise.resolve(match ?? null);
  }

  list(filter: SupplierFilter): Promise<readonly Supplier[]> {
    const selected = [...this.suppliers.values()].filter(
      (supplier) =>
        filter === "all" || supplier.active === (filter === "active"),
    );
    selected.sort((a, b) => {
      const aKey = supplierNameKey(a.name);
      const bKey = supplierNameKey(b.name);
      if (aKey < bKey) return -1;
      if (aKey > bKey) return 1;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
    return Promise.resolve(selected);
  }
}
