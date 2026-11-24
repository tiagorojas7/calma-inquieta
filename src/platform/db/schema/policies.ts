import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One published version of a site-wide document ("conditions" or "privacy").
 * Versions are immutable: a change is a new row with the next number of its
 * kind, so what a person accepted stays readable. Enrollments and seat
 * requests store the two numbers they showed, without a foreign key.
 */
export const policyVersion = pgTable(
  "policy_version",
  {
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    // 1-based per kind.
    version: integer("version").notNull(),
    body: text("body").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    publishedBy: text("published_by").notNull(),
  },
  (table) => [
    uniqueIndex("policy_version_kind_version_unique").on(
      table.kind,
      table.version,
    ),
    check(
      "policy_version_kind_check",
      sql`${table.kind} IN ('conditions', 'privacy')`,
    ),
    check("policy_version_version_check", sql`${table.version} > 0`),
    check("policy_version_body_check", sql`${table.body} ~ '[^[:space:]]'`),
  ],
);
