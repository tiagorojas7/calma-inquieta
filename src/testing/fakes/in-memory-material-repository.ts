import {
  MaterialNameConflictError,
  MaterialVariantLabelConflictError,
  materialNameKey,
  variantLabelKey,
  type Material,
  type MaterialFilter,
  type MaterialRepository,
} from "~/modules/materials";

function cloneMaterial(material: Material): Material {
  return {
    ...material,
    supplier: {
      ...material.supplier,
      audit: {
        ...material.supplier.audit,
        updatedAt: new Date(material.supplier.audit.updatedAt),
      },
    },
    image: material.image
      ? {
          ...material.image,
          asset: material.image.asset
            ? {
                ...material.image.asset,
                createdAt: new Date(material.image.asset.createdAt),
              }
            : null,
        }
      : null,
    variants: material.variants.map((variant) => ({ ...variant })),
    audit: {
      ...material.audit,
      updatedAt: new Date(material.audit.updatedAt),
    },
  };
}

/** Materials in memory, enforcing the same aggregate constraints as PostgreSQL. */
export class InMemoryMaterialRepository implements MaterialRepository {
  readonly materials = new Map<string, Material>();
  #failNextWrite = false;

  failNextWrite(): void {
    this.#failNextWrite = true;
  }

  private assertConstraints(material: Material): void {
    if (
      material.active &&
      [...this.materials.values()].some(
        (stored) =>
          stored.id !== material.id &&
          stored.active &&
          materialNameKey(stored.name) === materialNameKey(material.name),
      )
    )
      throw new MaterialNameConflictError();

    const labels = new Set<string>();
    for (const variant of material.variants) {
      const key = variantLabelKey(variant.label);
      if (labels.has(key)) throw new MaterialVariantLabelConflictError();
      labels.add(key);
    }
  }

  private write(material: Material): void {
    this.assertConstraints(material);
    const before = new Map(this.materials);
    this.materials.set(material.id, cloneMaterial(material));
    if (this.#failNextWrite) {
      this.#failNextWrite = false;
      this.materials.clear();
      for (const [id, stored] of before) this.materials.set(id, stored);
      throw new Error("configured material write failure");
    }
  }

  insert(material: Material): Promise<void> {
    if (this.materials.has(material.id))
      return Promise.reject(new Error("material already exists"));
    try {
      this.write(material);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error("material insert failed"),
      );
    }
  }

  update(material: Material): Promise<boolean> {
    if (!this.materials.has(material.id)) return Promise.resolve(false);
    try {
      this.write(material);
      return Promise.resolve(true);
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error("material update failed"),
      );
    }
  }

  findById(id: string): Promise<Material | null> {
    const stored = this.materials.get(id);
    return Promise.resolve(stored ? cloneMaterial(stored) : null);
  }

  findActiveByName(name: string): Promise<Material | null> {
    const key = materialNameKey(name);
    const stored = [...this.materials.values()].find(
      (material) => material.active && materialNameKey(material.name) === key,
    );
    return Promise.resolve(stored ? cloneMaterial(stored) : null);
  }

  async findByIds(
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, Material>> {
    const found = new Map<string, Material>();
    for (const id of ids) {
      const material = await this.findById(id);
      if (material) found.set(id, material);
    }
    return found;
  }

  list(filter: MaterialFilter): Promise<readonly Material[]> {
    const categoryKey = filter.category
      ? materialNameKey(filter.category)
      : null;
    const selected = [...this.materials.values()].filter(
      (material) =>
        (filter.state === "all" ||
          material.active === (filter.state === "active")) &&
        (categoryKey === null ||
          materialNameKey(material.category) === categoryKey) &&
        (filter.supplierId === undefined ||
          material.supplier.id === filter.supplierId),
    );
    selected.sort((left, right) => {
      const byName = materialNameKey(left.name).localeCompare(
        materialNameKey(right.name),
        "es",
      );
      return byName || left.id.localeCompare(right.id);
    });
    return Promise.resolve(selected.map(cloneMaterial));
  }
}
