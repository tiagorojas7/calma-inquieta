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
CREATE UNIQUE INDEX "enrollment_order_student_period_active_unique" ON "enrollment_order" USING btree ("student_id","period") WHERE "enrollment_order"."status" <> 'cancelled';
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
