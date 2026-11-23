import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
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
  type MaterialWrite,
  type VariantUsageLookup,
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
  const price =
    row.priceCentavos === null ? null : Money.fromCentavos(row.priceCentavos);
  if (price && !price.ok)
    throw new Error("persisted material price is invalid");
  const cost =
    row.costCentavos === null ? null : Money.fromCentavos(row.costCentavos);
  if (cost && !cost.ok) throw new Error("persisted material cost is invalid");
  return {
    id: row.id,
    label: row.label,
    price: price?.value ?? null,
    cost: cost?.value ?? null,
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
    keptInStudio: row.material.keptInStudio,
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

function rootValues(value: Material, includeKeptInStudio = true) {
  return {
    name: value.name,
    nameKey: materialNameKey(value.name),
    description: value.description,
    category: value.category,
    categoryKey: materialNameKey(value.category),
    supplierId: value.supplier.id,
    available: value.available,
    active: value.active,
    ...(includeKeptInStudio
      ? { keptInStudio: value.keptInStudio === true }
      : {}),
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
    priceCentavos: variant.price?.toCentavos() ?? null,
    costCentavos: variant.cost?.toCentavos() ?? null,
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

async function loadMaterials(
  db: Db,
  condition: SQL | undefined,
  variantUsage: VariantUsageLookup,
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
  const usedVariantIds = await variantUsage.findUsedVariantIds(
    variants.map((variant) => variant.id),
  );
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

const INSERT_CHUNK = 500;

/** Runs a whole batch on one transaction: grouped inserts, then updates. */
async function saveBatch(
  tx: Pick<Db, "insert" | "update" | "delete">,
  writes: readonly MaterialWrite[],
): Promise<void> {
  const inserts = writes.filter((write) => write.mode === "insert");
  const updates = writes.filter((write) => write.mode === "update");
  for (let start = 0; start < inserts.length; start += INSERT_CHUNK) {
    const chunk = inserts.slice(start, start + INSERT_CHUNK);
    await tx.insert(material).values(
      chunk.map((write) => ({
        id: write.material.id,
        ...rootValues(write.material),
      })),
    );
  }
  for (const write of updates) {
    const rows = await tx
      .update(material)
      .set(rootValues(write.material))
      .where(eq(material.id, write.material.id))
      .returning({ id: material.id });
    if (rows.length === 0) throw new Error("material not found");
  }
  const updatedIds = updates.map((write) => write.material.id);
  for (let start = 0; start < updatedIds.length; start += INSERT_CHUNK)
    await tx
      .delete(materialVariant)
      .where(
        inArray(
          materialVariant.materialId,
          updatedIds.slice(start, start + INSERT_CHUNK),
        ),
      );
  const variants = writes.flatMap((write) => variantValues(write.material));
  for (let start = 0; start < variants.length; start += INSERT_CHUNK)
    await tx
      .insert(materialVariant)
      .values(variants.slice(start, start + INSERT_CHUNK));
}

/** Short-lived sessions and transactional root+variant replacement. */
export function createDrizzleMaterialRepository(
  openSession: DbSessionFactory,
  variantUsage: VariantUsageLookup,
): MaterialRepository {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  async function updateMaterial(
    value: Material,
    preserveKeptInStudio: boolean,
  ): Promise<Material | null> {
    return withSession(async (db) => {
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx
            .update(material)
            .set(rootValues(value, !preserveKeptInStudio))
            .where(eq(material.id, value.id))
            .returning({ keptInStudio: material.keptInStudio });
          if (!row) return null;
          await tx
            .delete(materialVariant)
            .where(eq(materialVariant.materialId, value.id));
          await tx.insert(materialVariant).values(variantValues(value));
          return { ...value, keptInStudio: row.keptInStudio };
        });
      } catch (error) {
        return mapMaterialConflict(error);
      }
    });
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

    deleteIfUnused: (id) =>
      withSession((db) =>
        db.transaction(async (tx) => {
          // These writers have no catalog FK. Hold their tables until the check
          // and deletion commit, so simultaneous inserts cannot slip between them.
          await tx.execute(sql`LOCK TABLE material_variant, variant_stock,
            stock_adjustment, order_line, period_material_offer,
            intensive_project_material, intensive_request_material
            IN SHARE ROW EXCLUSIVE MODE`);
          const root = await tx.execute<{ id: string }>(
            sql`SELECT id FROM material WHERE id = ${id} FOR UPDATE`,
          );
          if (root.rows.length === 0) return "not-found" as const;
          const referenced = await tx.execute<{ blocked: boolean }>(sql`
            WITH own_variants AS (
              SELECT id FROM material_variant WHERE material_id = ${id}
            )
            SELECT (
              EXISTS (SELECT 1 FROM period_material_offer WHERE material_id = ${id})
              OR EXISTS (SELECT 1 FROM order_line WHERE material_id = ${id}
                OR variant_id IN (SELECT id FROM own_variants))
              OR EXISTS (SELECT 1 FROM intensive_project_material
                WHERE variant_id IN (SELECT id FROM own_variants))
              OR EXISTS (SELECT 1 FROM intensive_request_material
                WHERE variant_id IN (SELECT id FROM own_variants))
              OR EXISTS (SELECT 1 FROM variant_stock
                WHERE variant_id IN (SELECT id FROM own_variants) AND on_hand <> 0)
              OR EXISTS (SELECT 1 FROM stock_adjustment
                WHERE variant_id IN (SELECT id FROM own_variants))
            ) AS blocked`);
          if (referenced.rows[0]?.blocked) return "in-use" as const;
          await tx.execute(sql`DELETE FROM variant_stock WHERE variant_id IN
            (SELECT id FROM material_variant WHERE material_id = ${id})`);
          await tx.delete(material).where(eq(material.id, id));
          return "deleted" as const;
        }),
      ),

    update: async (value) => (await updateMaterial(value, false)) !== null,

    updatePreservingKeptInStudio: (value) => updateMaterial(value, true),

    setKeptInStudio: (id, kept, audit) =>
      withSession(async (db) => {
        const rows = await db
          .update(material)
          .set({
            keptInStudio: kept,
            updatedBy: audit.updatedBy,
            updatedAt: audit.updatedAt,
          })
          .where(eq(material.id, id))
          .returning({ id: material.id });
        if (rows.length === 0) return null;
        const values = await loadMaterials(
          db,
          eq(material.id, id),
          variantUsage,
        );
        return values[0] ?? null;
      }),

    findById: (id) =>
      withSession(async (db) => {
        const values = await loadMaterials(
          db,
          eq(material.id, id),
          variantUsage,
        );
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
          variantUsage,
        );
        return values[0] ?? null;
      }),

    findActiveByNames: (names) =>
      withSession(async (db) => {
        const keys = [...new Set(names.map(materialNameKey))];
        if (keys.length === 0) return new Map();
        const values = await loadMaterials(
          db,
          and(eq(material.active, true), inArray(material.nameKey, keys)),
          variantUsage,
        );
        return new Map(
          values.map((value) => [materialNameKey(value.name), value]),
        );
      }),

    saveAll: (writes) =>
      writes.length === 0
        ? Promise.resolve()
        : withSession(async (db) => {
            try {
              await db.transaction(async (tx) => {
                await saveBatch(tx, writes);
              });
            } catch (error) {
              mapMaterialConflict(error);
            }
          }),

    findByIds: (ids) =>
      withSession(async (db) => {
        if (ids.length === 0) return new Map();
        const values = await loadMaterials(
          db,
          inArray(material.id, [...new Set(ids)]),
          variantUsage,
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
          variantUsage,
        );
      }),
  };
}
