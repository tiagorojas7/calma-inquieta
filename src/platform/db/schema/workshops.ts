import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { mediaAsset } from "./media";
import { teacher } from "./teachers";

export const monthlyWorkshop = pgTable(
  "monthly_workshop",
  {
    id: uuid("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    technique: text("technique").notNull(),
    defaultFeeCentavos: bigint("default_fee_centavos", {
      mode: "number",
    }).notNull(),
    teacherId: uuid("teacher_id").references(() => teacher.id, {
      onDelete: "restrict",
    }),
    agreedPercentageBp: integer("agreed_percentage_bp"),
    status: text("status").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("monthly_workshop_slug_unique").on(table.slug),
    index("monthly_workshop_teacher_idx").on(table.teacherId),
    index("monthly_workshop_status_idx").on(table.status),
    check(
      "monthly_workshop_slug_check",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(${table.slug}) <= 80`,
    ),
    check("monthly_workshop_fee_check", sql`${table.defaultFeeCentavos} > 0`),
    check(
      "monthly_workshop_percentage_range_check",
      sql`${table.agreedPercentageBp} IS NULL OR ${table.agreedPercentageBp} BETWEEN 0 AND 10000`,
    ),
    check(
      "monthly_workshop_percentage_teacher_check",
      sql`${table.agreedPercentageBp} IS NULL OR ${table.teacherId} IS NOT NULL`,
    ),
    check(
      "monthly_workshop_status_check",
      sql`${table.status} IN ('draft', 'published', 'paused', 'archived')`,
    ),
  ],
);

export const workshopTurno = pgTable(
  "workshop_turno",
  {
    id: uuid("id").primaryKey(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => monthlyWorkshop.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    labelKey: text("label_key").notNull(),
    weekday: smallint("weekday").notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    defaultCapacity: integer("default_capacity").notNull(),
    active: boolean("active").notNull(),
  },
  (table) => [
    uniqueIndex("workshop_turno_workshop_label_key_unique").on(
      table.workshopId,
      table.labelKey,
    ),
    check(
      "workshop_turno_weekday_check",
      sql`${table.weekday} BETWEEN 1 AND 7`,
    ),
    check(
      "workshop_turno_time_range_check",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "workshop_turno_capacity_check",
      sql`${table.defaultCapacity} BETWEEN 1 AND 500`,
    ),
  ],
);

// No cancellation-deadline column: the cancellation policy is free text.
export const intensiveWorkshop = pgTable(
  "intensive_workshop",
  {
    id: uuid("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    teacherId: uuid("teacher_id").references(() => teacher.id, {
      onDelete: "restrict",
    }),
    // Basis points; only a third-party assignment stores one.
    agreedPercentageBp: integer("agreed_percentage_bp"),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    priceCentavos: bigint("price_centavos", { mode: "number" }).notNull(),
    depositCentavos: bigint("deposit_centavos", { mode: "number" }).notNull(),
    capacity: integer("capacity").notNull(),
    minSeats: integer("min_seats").notNull(),
    policyText: text("policy_text").notNull(),
    materialsIncluded: boolean("materials_included").notNull(),
    status: text("status").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("intensive_workshop_slug_unique").on(table.slug),
    index("intensive_workshop_teacher_idx").on(table.teacherId),
    index("intensive_workshop_status_idx").on(table.status),
    check(
      "intensive_workshop_slug_check",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(${table.slug}) <= 80`,
    ),
    check(
      "intensive_workshop_time_range_check",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check("intensive_workshop_price_check", sql`${table.priceCentavos} > 0`),
    check(
      "intensive_workshop_deposit_check",
      sql`${table.depositCentavos} > 0 AND ${table.depositCentavos} <= ${table.priceCentavos}`,
    ),
    check(
      "intensive_workshop_capacity_check",
      sql`${table.capacity} BETWEEN 1 AND 500`,
    ),
    check(
      "intensive_workshop_min_seats_check",
      sql`${table.minSeats} BETWEEN 1 AND ${table.capacity}`,
    ),
    check(
      "intensive_workshop_percentage_range_check",
      sql`${table.agreedPercentageBp} IS NULL OR ${table.agreedPercentageBp} BETWEEN 0 AND 10000`,
    ),
    check(
      "intensive_workshop_percentage_teacher_check",
      sql`${table.agreedPercentageBp} IS NULL OR ${table.teacherId} IS NOT NULL`,
    ),
    check(
      "intensive_workshop_status_check",
      sql`${table.status} IN ('draft', 'published', 'paused', 'cancelled', 'archived')`,
    ),
  ],
);

export const intensiveImage = pgTable(
  "intensive_image",
  {
    intensiveId: uuid("intensive_id")
      .notNull()
      .references(() => intensiveWorkshop.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAsset.id, { onDelete: "restrict" }),
    alt: text("alt").notNull(),
    position: smallint("position").notNull(),
  },
  (table) => [
    primaryKey({
      name: "intensive_image_pkey",
      columns: [table.intensiveId, table.position],
    }),
    check(
      "intensive_image_position_check",
      sql`${table.position} BETWEEN 0 AND 5`,
    ),
    check(
      "intensive_image_alt_check",
      sql`btrim(${table.alt}) <> '' AND length(${table.alt}) <= 200`,
    ),
  ],
);
