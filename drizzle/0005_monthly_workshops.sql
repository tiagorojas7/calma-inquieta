CREATE TABLE "monthly_workshop" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"technique" text NOT NULL,
	"default_fee_centavos" bigint NOT NULL,
	"teacher_id" uuid,
	"agreed_percentage_bp" integer,
	"status" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "monthly_workshop_slug_check" CHECK ("monthly_workshop"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("monthly_workshop"."slug") <= 80),
	CONSTRAINT "monthly_workshop_fee_check" CHECK ("monthly_workshop"."default_fee_centavos" > 0),
	CONSTRAINT "monthly_workshop_percentage_range_check" CHECK ("monthly_workshop"."agreed_percentage_bp" IS NULL OR "monthly_workshop"."agreed_percentage_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "monthly_workshop_percentage_teacher_check" CHECK ("monthly_workshop"."agreed_percentage_bp" IS NULL OR "monthly_workshop"."teacher_id" IS NOT NULL),
	CONSTRAINT "monthly_workshop_status_check" CHECK ("monthly_workshop"."status" IN ('draft', 'published', 'paused', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "monthly_workshop" ADD CONSTRAINT "monthly_workshop_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_workshop_slug_unique" ON "monthly_workshop" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "monthly_workshop_teacher_idx" ON "monthly_workshop" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "monthly_workshop_status_idx" ON "monthly_workshop" USING btree ("status");