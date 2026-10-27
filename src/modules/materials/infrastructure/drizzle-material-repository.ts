import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { orderLine } from "~/platform/db/schema/enrollments";
import {
  material,
  materialVariant,
  supplier,
} from "~/platform/db/schema/materials";
import type { DbSessionFactory } from "~/platform/db/session";
import { Money } from "~/modules/_shared";
import type {
  Material,
  MaterialVariant,
  Supplier,
} from "../application/contracts";
import {
  MaterialNameConflictError,
  MaterialVariantLabelConflictError,
  type MaterialFilter,
  type MaterialRepository,
} from "../application/material-repository";
import { materialNameKey, variantLabelKey } from "../domain/material-core";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
type MaterialRow = typeof material.$inferSelect;
type VariantRow = typeof materialVariant.$inferSelect;
type SupplierRow = typeof supplier.$inferSelect;
type JoinedRow = {
  readonly material: MaterialRow;
  readonly supplier: SupplierRow;
};

function toSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    active: row.active,
    audit: { updatedBy: row.updatedBy, updatedAt: row.updatedAt },
  };
}

function toVariant(row: VariantRow): MaterialVariant {
  const price = Money.fromCentavos(row.priceCentavos);
  if (!price.ok) throw new Error("persisted material price is invalid");
  return {
    id: row.id,
    label: row.label,
    price: price.value,
    available: row.available,
    used: false,
    position: row.position,
    swatch: row.swatch,
  };
}

export function markUsedVariants(
  variants: readonly MaterialVariant[],
  usedVariantIds: ReadonlySet<string>,
): readonly MaterialVariant[] {
  return variants.map((variant) => ({
    ...variant,
    used: usedVariantIds.has(variant.id),
  }));
}

function toMaterial(
  row: JoinedRow,
  variants: readonly VariantRow[],
  usedVariantIds: ReadonlySet<string>,
): Material {
  return {
    id: row.material.id,
    name: row.material.name,
    description: row.material.description,
    category: row.material.category,
    supplier: toSupplier(row.supplier),
    available: row.material.available,
    active: row.material.active,
    image:
      row.material.imageAssetId && row.material.imageAlt
        ? {
            assetId: row.material.imageAssetId,
            alt: row.material.imageAlt,
            asset: null,
          }
        : null,
    variants: markUsedVariants(variants.map(toVariant), usedVariantIds),
    audit: {
      updatedBy: row.material.updatedBy,
      updatedAt: row.material.updatedAt,
    },
  };
}

function rootValues(value: Material) {
  return {
    name: value.name,
    nameKey: materialNameKey(value.name),
    description: value.description,
    category: value.category,
    categoryKey: materialNameKey(value.category),
    supplierId: value.supplier.id,
    available: value.available,
    active: value.active,
    imageAssetId: value.image?.assetId ?? null,
    imageAlt: value.image?.alt ?? null,
    updatedBy: value.audit.updatedBy,
    updatedAt: value.audit.updatedAt,
  };
}

function variantValues(value: Material) {
  return value.variants.map((variant) => ({
    id: variant.id,
    materialId: value.id,
    label: variant.label,
    labelKey: variantLabelKey(variant.label),
    priceCentavos: variant.price.toCentavos(),
    available: variant.available,
    position: variant.position,
    swatch: variant.swatch,
  }));
}

function hasConstraint(error: unknown, constraint: string): boolean {
  const visited = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null) {
    if (visited.has(current)) return false;
    visited.add(current);
    try {
      const candidate = current as {
        readonly code?: unknown;
        readonly constraint?: unknown;
        readonly cause?: unknown;
      };
      if (candidate.code === "23505" && candidate.constraint === constraint)
        return true;
      current = candidate.cause;
    } catch {
      return false;
    }
  }
  return false;
}

function mapMaterialConflict(error: unknown): never {
  if (hasConstraint(error, "material_active_name_unique"))
    throw new MaterialNameConflictError();
  if (hasConstraint(error, "material_variant_label_unique"))
    throw new MaterialVariantLabelConflictError();
  throw error;
}

async function loadUsedVariantIds(
  db: Db,
  variants: readonly VariantRow[],
): Promise<ReadonlySet<string>> {
  if (variants.length === 0) return new Set();
  const rows = await db
    .select({ variantId: orderLine.variantId })
    .from(orderLine)
    .where(
      inArray(
        orderLine.variantId,
        variants.map((variant) => variant.id),
      ),
    );
  return new Set(rows.map((row) => row.variantId));
}

async function loadMaterials(
  db: Db,
  condition: SQL | undefined,
): Promise<readonly Material[]> {
  const roots = await db
    .select({ material, supplier })
    .from(material)
    .innerJoin(supplier, eq(material.supplierId, supplier.id))
    .where(condition)
    .orderBy(asc(material.nameKey), asc(material.id));
  if (roots.length === 0) return [];
  const ids = roots.map((row) => row.material.id);
  const variants = await db
    .select()
    .from(materialVariant)
    .where(inArray(materialVariant.materialId, ids))
    .orderBy(
      asc(materialVariant.materialId),
      asc(materialVariant.position),
      asc(materialVariant.id),
    );
  const usedVariantIds = await loadUsedVariantIds(db, variants);
  const byMaterial = new Map<string, VariantRow[]>();
  for (const variant of variants) {
    const values = byMaterial.get(variant.materialId) ?? [];
    values.push(variant);
    byMaterial.set(variant.materialId, values);
  }
  return roots.map((row) =>
    toMaterial(row, byMaterial.get(row.material.id) ?? [], usedVariantIds),
  );
}

/** Short-lived sessions and transactional root+variant replacement. */
export function createDrizzleMaterialRepository(
  openSession: DbSessionFactory,
): MaterialRepository {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    insert: (value) =>
      withSession(async (db) => {
        try {
          await db.transaction(async (tx) => {
            await tx.insert(material).values({
              id: value.id,
              ...rootValues(value),
            });
            await tx.insert(materialVariant).values(variantValues(value));
          });
        } catch (error) {
          mapMaterialConflict(error);
        }
      }),

    update: (value) =>
      withSession(async (db) => {
        try {
          return await db.transaction(async (tx) => {
            const rows = await tx
              .update(material)
              .set(rootValues(value))
              .where(eq(material.id, value.id))
              .returning({ id: material.id });
            if (rows.length === 0) return false;
            await tx
              .delete(materialVariant)
              .where(eq(materialVariant.materialId, value.id));
            await tx.insert(materialVariant).values(variantValues(value));
            return true;
          });
        } catch (error) {
          return mapMaterialConflict(error);
        }
      }),

    findById: (id) =>
      withSession(async (db) => {
        const values = await loadMaterials(db, eq(material.id, id));
        return values[0] ?? null;
      }),

    findActiveByName: (name) =>
      withSession(async (db) => {
        const values = await loadMaterials(
          db,
          and(
            eq(material.active, true),
            eq(material.nameKey, materialNameKey(name)),
          ),
        );
        return values[0] ?? null;
      }),

    findByIds: (ids) =>
      withSession(async (db) => {
        if (ids.length === 0) return new Map();
        const values = await loadMaterials(
          db,
          inArray(material.id, [...new Set(ids)]),
        );
        const byId = new Map(values.map((value) => [value.id, value]));
        const ordered = new Map<string, Material>();
        for (const id of ids) {
          const value = byId.get(id);
          if (value) ordered.set(id, value);
        }
        return ordered;
      }),

    list: (filter: MaterialFilter) =>
      withSession((db) => {
        const conditions: SQL[] = [];
        if (filter.state !== "all")
          conditions.push(eq(material.active, filter.state === "active"));
        if (filter.category)
          conditions.push(
            eq(material.categoryKey, materialNameKey(filter.category)),
          );
        if (filter.supplierId)
          conditions.push(eq(material.supplierId, filter.supplierId));
        return loadMaterials(
          db,
          conditions.length > 0 ? and(...conditions) : undefined,
        );
      }),
  };
}
