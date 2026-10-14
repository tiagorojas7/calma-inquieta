import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const mediaAsset = pgTable(
  "media_asset",
  {
    id: uuid("id").primaryKey(),
    storageKey: text("storage_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "media_asset_content_type_check",
      sql`${table.contentType} IN ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "media_asset_byte_size_check",
      sql`${table.byteSize} BETWEEN 1 AND 5242880`,
    ),
    check("media_asset_width_check", sql`${table.width} BETWEEN 1 AND 10000`),
    check("media_asset_height_check", sql`${table.height} BETWEEN 1 AND 10000`),
  ],
);
