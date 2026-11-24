import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { mediaAsset } from "./media";

export const supplier = pgTable(
  "supplier",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    // Case-folded in code (supplierNameKey); lower() is locale-dependent.
    nameKey: text("name_key").notNull(),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("supplier_active_name_unique")
      .on(table.nameKey)
      .where(sql`${table.active}`),
  ],
);

export const material = pgTable(
  "material",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    // Case-folded in code (materialNameKey); lower() is locale-dependent.
    nameKey: text("name_key").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    categoryKey: text("category_key").notNull(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    available: boolean("available").notNull().default(true),
    active: boolean("active").notNull().default(true),
    imageAssetId: uuid("image_asset_id").references(() => mediaAsset.id),
    imageAlt: text("image_alt"),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("material_active_name_unique")
      .on(table.nameKey)
      .where(sql`${table.active}`),
    check("material_name_check", sql`btrim(${table.name}) <> ''`),
    check("material_description_check", sql`btrim(${table.description}) <> ''`),
    check("material_category_check", sql`btrim(${table.category}) <> ''`),
    check(
      "material_image_pair_check",
      sql`(${table.imageAssetId} IS NULL AND ${table.imageAlt} IS NULL)
          OR (${table.imageAssetId} IS NOT NULL AND ${table.imageAlt} IS NOT NULL
              AND btrim(${table.imageAlt}) <> '')`,
    ),
  ],
);

export const materialVariant = pgTable(
  "material_variant",
  {
    id: uuid("id").primaryKey(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => material.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Case-folded in code (variantLabelKey); lower() is locale-dependent.
    labelKey: text("label_key").notNull(),
    // NULL means "consultar precio": shown to students, never orderable.
    priceCentavos: bigint("price_centavos", { mode: "number" }),
    // Current supplier cost; NULL until the owner loads it.
    costCentavos: bigint("cost_centavos", { mode: "number" }),
    available: boolean("available").notNull().default(true),
    position: integer("position").notNull(),
    swatch: text("swatch"),
  },
  (table) => [
    uniqueIndex("material_variant_label_unique").on(
      table.materialId,
      table.labelKey,
    ),
    uniqueIndex("material_variant_position_unique").on(
      table.materialId,
      table.position,
    ),
    check("material_variant_label_check", sql`btrim(${table.label}) <> ''`),
    check("material_variant_price_check", sql`${table.priceCentavos} > 0`),
    check("material_variant_cost_check", sql`${table.costCentavos} > 0`),
    check("material_variant_position_check", sql`${table.position} >= 0`),
    check(
      "material_variant_swatch_check",
      sql`${table.swatch} IS NULL OR ${table.swatch} ~ '^#[0-9a-f]{6}$'`,
    ),
  ],
);

/**
 * On-hand units per variant. It deliberately has no foreign key to
 * `material_variant`: saving a material deletes and re-inserts its variant
 * rows, and the count must survive that. A variant without a row has 0 units.
 */
export const variantStock = pgTable(
  "variant_stock",
  {
    variantId: uuid("variant_id").primaryKey(),
    onHand: integer("on_hand").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [check("variant_stock_on_hand_check", sql`${table.onHand} >= 0`)],
);

/** Audit trail of manual stock adjustments; no foreign key, like the count. */
export const stockAdjustment = pgTable(
  "stock_adjustment",
  {
    id: uuid("id").primaryKey(),
    variantId: uuid("variant_id").notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    by: text("by").notNull(),
  },
  (table) => [
    index("stock_adjustment_variant_idx").on(table.variantId, table.at),
    check("stock_adjustment_delta_check", sql`${table.delta} <> 0`),
    check("stock_adjustment_reason_check", sql`btrim(${table.reason}) <> ''`),
  ],
);
