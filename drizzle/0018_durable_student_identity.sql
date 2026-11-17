CREATE TABLE "student" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_digits" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "student_email_unique" UNIQUE("email"),
	CONSTRAINT "student_phone_digits_unique" UNIQUE("phone_digits"),
	CONSTRAINT "student_full_name_check" CHECK ("student"."full_name" = btrim("student"."full_name") AND "student"."full_name" <> ''),
	CONSTRAINT "student_email_check" CHECK ("student"."email" = lower(btrim("student"."email")) AND "student"."email" <> ''),
	CONSTRAINT "student_phone_digits_check" CHECK ("student"."phone_digits" ~ '^[0-9]{10,15}$')
);
--> statement-breakpoint
INSERT INTO "student" (
	"id",
	"full_name",
	"email",
	"phone_digits",
	"created_at",
	"updated_at"
)
SELECT DISTINCT ON (lower(btrim("student_email")))
	md5(lower(btrim("student_email")))::uuid,
	btrim("student_name"),
	lower(btrim("student_email")),
	"student_phone_digits",
	"requested_at",
	"requested_at"
FROM "enrollment_order"
ORDER BY lower(btrim("student_email")), "requested_at" DESC;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "student_id" uuid;
--> statement-breakpoint
UPDATE "enrollment_order"
SET "student_id" = md5(lower(btrim("student_email")))::uuid;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ALTER COLUMN "student_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "enrollment_order_active_duplicate_unique";
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "kind" text DEFAULT 'enrollment' NOT NULL;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "parent_order_id" uuid;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_parent_order_id_enrollment_order_id_fk" FOREIGN KEY ("parent_order_id") REFERENCES "public"."enrollment_order"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_order_student_period_active_unique" ON "enrollment_order" USING btree ("student_id","period") WHERE "enrollment_order"."status" <> 'cancelled' AND "enrollment_order"."kind" = 'enrollment';
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_kind_check" CHECK ("enrollment_order"."kind" IN ('enrollment', 'material_sale'));
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_sale_check" CHECK (("enrollment_order"."kind" = 'enrollment' AND "enrollment_order"."parent_order_id" IS NULL)
          OR ("enrollment_order"."kind" = 'material_sale'
            AND "enrollment_order"."parent_order_id" IS NOT NULL
            AND "enrollment_order"."fee_centavos" = 0
            AND "enrollment_order"."materials_centavos" > 0));
--> statement-breakpoint
ALTER TABLE "enrollment_order" DROP CONSTRAINT "enrollment_order_fee_check";
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_fee_check" CHECK ("enrollment_order"."fee_centavos" >= 0);
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "refunded_amount_centavos" bigint;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "refunded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "refund_note" text;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "refunded_by" text;
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_refund_whole_pesos_check" CHECK ("enrollment_order"."refunded_amount_centavos" IS NULL OR "enrollment_order"."refunded_amount_centavos" % 100 = 0);
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_refund_bounds_check" CHECK ("enrollment_order"."refunded_amount_centavos" IS NULL
          OR ("enrollment_order"."refunded_amount_centavos" >= 0
            AND "enrollment_order"."paid_amount_centavos" IS NOT NULL
            AND "enrollment_order"."refunded_amount_centavos" <= "enrollment_order"."paid_amount_centavos"));
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_refund_state_check" CHECK (("enrollment_order"."refunded_amount_centavos" IS NULL
            AND "enrollment_order"."refunded_at" IS NULL
            AND "enrollment_order"."refunded_by" IS NULL
            AND "enrollment_order"."refund_note" IS NULL)
          OR ("enrollment_order"."status" = 'cancelled'
            AND "enrollment_order"."paid_at" IS NOT NULL
            AND "enrollment_order"."refunded_amount_centavos" IS NOT NULL
            AND "enrollment_order"."refunded_at" IS NOT NULL
            AND "enrollment_order"."refunded_by" IS NOT NULL));
--> statement-breakpoint
CREATE TABLE "order_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"actor" text NOT NULL,
	"note" text,
	"before_workshop_id" uuid NOT NULL,
	"before_workshop_name" text NOT NULL,
	"before_period_id" uuid NOT NULL,
	"before_period" text NOT NULL,
	"before_turno_id" uuid NOT NULL,
	"before_turno_label" text NOT NULL,
	"before_weekday" integer NOT NULL,
	"before_starts_at" time NOT NULL,
	"before_ends_at" time NOT NULL,
	"before_fee_centavos" bigint NOT NULL,
	"before_total_centavos" bigint NOT NULL,
	"before_status" text NOT NULL,
	"after_workshop_id" uuid NOT NULL,
	"after_workshop_name" text NOT NULL,
	"after_period_id" uuid NOT NULL,
	"after_period" text NOT NULL,
	"after_turno_id" uuid NOT NULL,
	"after_turno_label" text NOT NULL,
	"after_weekday" integer NOT NULL,
	"after_starts_at" time NOT NULL,
	"after_ends_at" time NOT NULL,
	"after_fee_centavos" bigint NOT NULL,
	"after_total_centavos" bigint NOT NULL,
	"after_status" text NOT NULL,
	"previous_paid_amount_centavos" bigint,
	"previous_paid_at" timestamp with time zone,
	"previous_confirmed_by" text,
	"refunded_amount_centavos" bigint,
	"refunded_at" timestamp with time zone,
	"refund_note" text,
	CONSTRAINT "order_correction_status_check" CHECK ("order_correction"."before_status" IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received') AND "order_correction"."after_status" IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received')),
	CONSTRAINT "order_correction_weekday_check" CHECK ("order_correction"."before_weekday" BETWEEN 1 AND 7 AND "order_correction"."after_weekday" BETWEEN 1 AND 7),
	CONSTRAINT "order_correction_time_range_check" CHECK ("order_correction"."before_ends_at" > "order_correction"."before_starts_at" AND "order_correction"."after_ends_at" > "order_correction"."after_starts_at"),
	CONSTRAINT "order_correction_amounts_check" CHECK ("order_correction"."before_fee_centavos" >= 0
          AND "order_correction"."after_fee_centavos" >= 0
          AND "order_correction"."before_total_centavos" >= "order_correction"."before_fee_centavos"
          AND "order_correction"."after_total_centavos" >= "order_correction"."after_fee_centavos"
          AND "order_correction"."before_fee_centavos" % 100 = 0
          AND "order_correction"."after_fee_centavos" % 100 = 0
          AND "order_correction"."before_total_centavos" % 100 = 0
          AND "order_correction"."after_total_centavos" % 100 = 0
          AND "order_correction"."after_total_centavos" - "order_correction"."after_fee_centavos" = "order_correction"."before_total_centavos" - "order_correction"."before_fee_centavos"),
	CONSTRAINT "order_correction_outcome_check" CHECK (("order_correction"."before_status" = 'pending_confirmation'
            AND "order_correction"."after_status" = 'pending_confirmation')
          OR ("order_correction"."before_status" <> 'pending_confirmation'
            AND "order_correction"."after_total_centavos" > "order_correction"."before_total_centavos"
            AND "order_correction"."after_status" = 'pending_confirmation')
          OR ("order_correction"."before_status" <> 'pending_confirmation'
            AND "order_correction"."after_total_centavos" <= "order_correction"."before_total_centavos"
            AND "order_correction"."after_status" = "order_correction"."before_status")),
	CONSTRAINT "order_correction_previous_payment_check" CHECK (("order_correction"."previous_paid_amount_centavos" IS NULL
            AND "order_correction"."previous_paid_at" IS NULL
            AND "order_correction"."previous_confirmed_by" IS NULL
            AND NOT ("order_correction"."before_status" <> 'pending_confirmation'
              AND "order_correction"."after_status" = 'pending_confirmation'))
          OR ("order_correction"."previous_paid_amount_centavos" = "order_correction"."before_total_centavos"
            AND "order_correction"."previous_paid_at" IS NOT NULL
            AND "order_correction"."before_status" <> 'pending_confirmation'
            AND "order_correction"."after_status" = 'pending_confirmation')),
	CONSTRAINT "order_correction_refund_check" CHECK (("order_correction"."refunded_amount_centavos" IS NULL
            AND "order_correction"."refunded_at" IS NULL
            AND "order_correction"."refund_note" IS NULL
            AND NOT ("order_correction"."before_status" <> 'pending_confirmation'
              AND "order_correction"."after_total_centavos" < "order_correction"."before_total_centavos"))
          OR ("order_correction"."refunded_amount_centavos" IS NOT NULL
            AND "order_correction"."refunded_at" IS NOT NULL
            AND "order_correction"."before_status" <> 'pending_confirmation'
            AND "order_correction"."after_total_centavos" < "order_correction"."before_total_centavos"
            AND "order_correction"."refunded_amount_centavos" >= 0
            AND "order_correction"."refunded_amount_centavos" % 100 = 0
            AND "order_correction"."refunded_amount_centavos" <= "order_correction"."before_total_centavos" - "order_correction"."after_total_centavos"))
);
--> statement-breakpoint
ALTER TABLE "order_correction" ADD CONSTRAINT "order_correction_order_id_enrollment_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."enrollment_order"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_make_up" DROP CONSTRAINT "attendance_make_up_status_check";--> statement-breakpoint
ALTER TABLE "attendance_make_up" ADD CONSTRAINT "attendance_make_up_status_check" CHECK ("attendance_make_up"."status" IN ('pending', 'done', 'missed'));--> statement-breakpoint
ALTER TABLE "attendance_make_up" DROP CONSTRAINT "attendance_make_up_done_check";--> statement-breakpoint
ALTER TABLE "attendance_make_up" ADD CONSTRAINT "attendance_make_up_done_check" CHECK (("attendance_make_up"."status" IN ('done', 'missed')) = ("attendance_make_up"."done_at" IS NOT NULL AND "attendance_make_up"."done_by" IS NOT NULL));
--> statement-breakpoint
CREATE TABLE "stock_adjustment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"variant_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"by" text NOT NULL,
	CONSTRAINT "stock_adjustment_delta_check" CHECK ("stock_adjustment"."delta" <> 0),
	CONSTRAINT "stock_adjustment_reason_check" CHECK (btrim("stock_adjustment"."reason") <> '')
);
--> statement-breakpoint
CREATE TABLE "variant_stock" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"on_hand" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "variant_stock_on_hand_check" CHECK ("variant_stock"."on_hand" >= 0)
);
--> statement-breakpoint
ALTER TABLE "material_variant" ADD COLUMN "cost_centavos" bigint;--> statement-breakpoint
CREATE INDEX "stock_adjustment_variant_idx" ON "stock_adjustment" USING btree ("variant_id","at");--> statement-breakpoint
ALTER TABLE "material_variant" ADD CONSTRAINT "material_variant_cost_check" CHECK ("material_variant"."cost_centavos" > 0);
--> statement-breakpoint
ALTER TABLE "order_line" ADD COLUMN "source" text DEFAULT 'supplier' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_line" ADD COLUMN "unit_cost_centavos" bigint;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_source_check" CHECK ("order_line"."source" IN ('stock', 'supplier'));--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_unit_cost_check" CHECK ("order_line"."unit_cost_centavos" > 0);
--> statement-breakpoint
CREATE TABLE "intensive_request_material" (
	"request_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"variant_id" uuid NOT NULL,
	"material_name" text NOT NULL,
	"variant_label" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost_centavos" bigint,
	"source" text NOT NULL,
	"requested_at" timestamp with time zone,
	CONSTRAINT "intensive_request_material_pkey" PRIMARY KEY("request_id","position"),
	CONSTRAINT "intensive_request_material_position_check" CHECK ("intensive_request_material"."position" >= 0),
	CONSTRAINT "intensive_request_material_quantity_check" CHECK ("intensive_request_material"."quantity" BETWEEN 1 AND 20),
	CONSTRAINT "intensive_request_material_unit_cost_check" CHECK ("intensive_request_material"."unit_cost_centavos" > 0),
	CONSTRAINT "intensive_request_material_source_check" CHECK ("intensive_request_material"."source" IN ('stock', 'supplier'))
);
--> statement-breakpoint
CREATE TABLE "intensive_project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"intensive_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"media_asset_id" uuid,
	"alt" text,
	"price_centavos" bigint NOT NULL,
	"deposit_centavos" bigint NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "intensive_project_position_unique" UNIQUE("intensive_id","position"),
	CONSTRAINT "intensive_project_position_check" CHECK ("intensive_project"."position" >= 0),
	CONSTRAINT "intensive_project_name_check" CHECK (btrim("intensive_project"."name") <> '' AND length("intensive_project"."name") <= 80),
	CONSTRAINT "intensive_project_price_check" CHECK ("intensive_project"."price_centavos" > 0 AND "intensive_project"."price_centavos" % 100 = 0),
	CONSTRAINT "intensive_project_deposit_check" CHECK ("intensive_project"."deposit_centavos" > 0 AND "intensive_project"."deposit_centavos" <= "intensive_project"."price_centavos" AND "intensive_project"."deposit_centavos" % 100 = 0),
	CONSTRAINT "intensive_project_image_check" CHECK (("intensive_project"."media_asset_id" IS NULL AND "intensive_project"."alt" IS NULL)
          OR ("intensive_project"."media_asset_id" IS NOT NULL AND "intensive_project"."alt" IS NOT NULL
              AND btrim("intensive_project"."alt") <> '' AND length("intensive_project"."alt") <= 200))
);
--> statement-breakpoint
CREATE TABLE "intensive_project_material" (
	"project_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "intensive_project_material_pkey" PRIMARY KEY("project_id","position"),
	CONSTRAINT "intensive_project_material_position_check" CHECK ("intensive_project_material"."position" >= 0),
	CONSTRAINT "intensive_project_material_quantity_check" CHECK ("intensive_project_material"."quantity" BETWEEN 1 AND 20)
);
--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "price_centavos" bigint;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "deposit_centavos" bigint;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "balance_centavos" bigint;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "balance_paid_on" text;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "balance_note" text;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "balance_by" text;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "balance_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "refund_centavos" bigint;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "refunded_on" text;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "refund_note" text;--> statement-breakpoint
ALTER TABLE "intensive_request_material" ADD CONSTRAINT "intensive_request_material_request_id_intensive_seat_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."intensive_seat_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intensive_project" ADD CONSTRAINT "intensive_project_intensive_id_intensive_workshop_id_fk" FOREIGN KEY ("intensive_id") REFERENCES "public"."intensive_workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intensive_project" ADD CONSTRAINT "intensive_project_media_asset_id_media_asset_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_asset"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intensive_project_material" ADD CONSTRAINT "intensive_project_material_project_id_intensive_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."intensive_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intensive_project_media_asset_idx" ON "intensive_project" USING btree ("media_asset_id");--> statement-breakpoint
INSERT INTO "intensive_project" (
	"id",
	"intensive_id",
	"position",
	"name",
	"price_centavos",
	"deposit_centavos",
	"updated_by",
	"updated_at"
)
SELECT
	md5('intensive_project:' || "id"::text)::uuid,
	"id",
	0,
	btrim(left(btrim("name"), 80)),
	"price_centavos",
	"deposit_centavos",
	'migration 0018',
	"updated_at"
FROM "intensive_workshop";
--> statement-breakpoint
UPDATE "intensive_seat_request" AS "request"
SET
	"project_id" = "project"."id",
	"price_centavos" = "project"."price_centavos",
	"deposit_centavos" = "project"."deposit_centavos"
FROM "intensive_project" AS "project"
WHERE "project"."intensive_id" = "request"."intensive_id"
	AND "project"."position" = 0;
--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_snapshot_check" CHECK (("intensive_seat_request"."price_centavos" IS NULL AND "intensive_seat_request"."deposit_centavos" IS NULL)
          OR ("intensive_seat_request"."price_centavos" IS NOT NULL AND "intensive_seat_request"."deposit_centavos" IS NOT NULL
              AND "intensive_seat_request"."price_centavos" > 0 AND "intensive_seat_request"."deposit_centavos" > 0
              AND "intensive_seat_request"."deposit_centavos" <= "intensive_seat_request"."price_centavos"
              AND "intensive_seat_request"."price_centavos" % 100 = 0
              AND "intensive_seat_request"."deposit_centavos" % 100 = 0));--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_balance_complete_check" CHECK (("intensive_seat_request"."balance_centavos" IS NULL AND "intensive_seat_request"."balance_paid_on" IS NULL
            AND "intensive_seat_request"."balance_by" IS NULL AND "intensive_seat_request"."balance_at" IS NULL
            AND "intensive_seat_request"."balance_note" IS NULL)
          OR ("intensive_seat_request"."balance_centavos" IS NOT NULL AND "intensive_seat_request"."balance_paid_on" IS NOT NULL
              AND "intensive_seat_request"."balance_by" IS NOT NULL AND "intensive_seat_request"."balance_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_balance_status_check" CHECK ("intensive_seat_request"."balance_centavos" IS NULL
          OR ("intensive_seat_request"."status" IN ('confirmed', 'cancelled') AND "intensive_seat_request"."paid_centavos" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_balance_amount_check" CHECK ("intensive_seat_request"."balance_centavos" IS NULL
          OR ("intensive_seat_request"."balance_centavos" > 0
              AND ("intensive_seat_request"."price_centavos" IS NULL
                   OR "intensive_seat_request"."balance_centavos" = "intensive_seat_request"."price_centavos" - "intensive_seat_request"."deposit_centavos")));--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_refund_complete_check" CHECK (("intensive_seat_request"."refund_centavos" IS NULL AND "intensive_seat_request"."refunded_on" IS NULL
            AND "intensive_seat_request"."refund_note" IS NULL)
          OR ("intensive_seat_request"."refund_centavos" IS NOT NULL AND "intensive_seat_request"."refunded_on" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_refund_status_check" CHECK ("intensive_seat_request"."refund_centavos" IS NULL OR "intensive_seat_request"."status" = 'cancelled');--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_refund_amount_check" CHECK ("intensive_seat_request"."refund_centavos" IS NULL
          OR ("intensive_seat_request"."refund_centavos" >= 0 AND "intensive_seat_request"."refund_centavos" % 100 = 0
              AND "intensive_seat_request"."paid_centavos" IS NOT NULL
              AND "intensive_seat_request"."refund_centavos" <= "intensive_seat_request"."paid_centavos" + COALESCE("intensive_seat_request"."balance_centavos", 0)));
--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD COLUMN "seen_by" text;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD COLUMN "seen_by" text;--> statement-breakpoint
ALTER TABLE "private_event_request" ADD COLUMN "seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "private_event_request" ADD COLUMN "seen_by" text;--> statement-breakpoint
UPDATE "enrollment_order" SET "seen_at" = "requested_at", "seen_by" = 'migration 0018';--> statement-breakpoint
UPDATE "intensive_seat_request" SET "seen_at" = "created_at", "seen_by" = 'migration 0018';--> statement-breakpoint
UPDATE "private_event_request" SET "seen_at" = "created_at", "seen_by" = 'migration 0018';--> statement-breakpoint
ALTER TABLE "enrollment_order" ADD CONSTRAINT "enrollment_order_seen_check" CHECK (("enrollment_order"."seen_at" IS NULL) = ("enrollment_order"."seen_by" IS NULL));--> statement-breakpoint
ALTER TABLE "intensive_seat_request" ADD CONSTRAINT "intensive_seat_request_seen_check" CHECK (("intensive_seat_request"."seen_at" IS NULL) = ("intensive_seat_request"."seen_by" IS NULL));--> statement-breakpoint
ALTER TABLE "private_event_request" ADD CONSTRAINT "private_event_request_seen_check" CHECK (("private_event_request"."seen_at" IS NULL) = ("private_event_request"."seen_by" IS NULL));
