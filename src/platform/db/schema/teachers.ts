import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// No percentage column: the agreed percentage lives on each assignment (D2).
export const teacher = pgTable(
  "teacher",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    // Case-folded in code (teacherNameKey); lower() is locale-dependent.
    nameKey: text("name_key").notNull(),
    bioLine: text("bio_line").notNull(),
    phone: text("phone"),
    email: text("email"),
    modality: text("modality").notNull(),
    active: boolean("active").notNull().default(true),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "teacher_modality_check",
      sql`${table.modality} IN ('own', 'third_party')`,
    ),
    uniqueIndex("teacher_active_name_unique")
      .on(table.nameKey)
      .where(sql`${table.active}`),
  ],
);
