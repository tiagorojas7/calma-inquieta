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
