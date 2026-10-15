import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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
