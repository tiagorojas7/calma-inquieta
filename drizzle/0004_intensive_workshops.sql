CREATE TABLE "intensive_image" (
	"intensive_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"alt" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "intensive_image_pkey" PRIMARY KEY("intensive_id","position"),
	CONSTRAINT "intensive_image_position_check" CHECK ("intensive_image"."position" BETWEEN 0 AND 5),
	CONSTRAINT "intensive_image_alt_check" CHECK (btrim("intensive_image"."alt") <> '' AND length("intensive_image"."alt") <= 200)
);
--> statement-breakpoint
CREATE TABLE "intensive_workshop" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"teacher_id" uuid,
	"agreed_percentage_bp" integer,
	"event_date" date NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"price_centavos" bigint NOT NULL,
	"deposit_centavos" bigint NOT NULL,
	"capacity" integer NOT NULL,
	"min_seats" integer NOT NULL,
	"policy_text" text NOT NULL,
	"materials_included" boolean NOT NULL,
	"status" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "intensive_workshop_slug_check" CHECK ("intensive_workshop"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("intensive_workshop"."slug") <= 80),
	CONSTRAINT "intensive_workshop_time_range_check" CHECK ("intensive_workshop"."ends_at" > "intensive_workshop"."starts_at"),
	CONSTRAINT "intensive_workshop_price_check" CHECK ("intensive_workshop"."price_centavos" > 0),
	CONSTRAINT "intensive_workshop_deposit_check" CHECK ("intensive_workshop"."deposit_centavos" > 0 AND "intensive_workshop"."deposit_centavos" <= "intensive_workshop"."price_centavos"),
	CONSTRAINT "intensive_workshop_capacity_check" CHECK ("intensive_workshop"."capacity" BETWEEN 1 AND 500),
	CONSTRAINT "intensive_workshop_min_seats_check" CHECK ("intensive_workshop"."min_seats" BETWEEN 1 AND "intensive_workshop"."capacity"),
	CONSTRAINT "intensive_workshop_percentage_range_check" CHECK ("intensive_workshop"."agreed_percentage_bp" IS NULL OR "intensive_workshop"."agreed_percentage_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "intensive_workshop_percentage_teacher_check" CHECK ("intensive_workshop"."agreed_percentage_bp" IS NULL OR "intensive_workshop"."teacher_id" IS NOT NULL),
	CONSTRAINT "intensive_workshop_status_check" CHECK ("intensive_workshop"."status" IN ('draft', 'published', 'paused', 'cancelled', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "intensive_image" ADD CONSTRAINT "intensive_image_intensive_id_intensive_workshop_id_fk" FOREIGN KEY ("intensive_id") REFERENCES "public"."intensive_workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intensive_image" ADD CONSTRAINT "intensive_image_media_asset_id_media_asset_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_asset"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intensive_workshop" ADD CONSTRAINT "intensive_workshop_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intensive_workshop_slug_unique" ON "intensive_workshop" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "intensive_workshop_teacher_idx" ON "intensive_workshop" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "intensive_workshop_status_idx" ON "intensive_workshop" USING btree ("status");