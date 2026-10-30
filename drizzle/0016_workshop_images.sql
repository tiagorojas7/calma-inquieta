CREATE TABLE "workshop_image" (
	"workshop_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"alt" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "workshop_image_pkey" PRIMARY KEY("workshop_id","position"),
	CONSTRAINT "workshop_image_position_check" CHECK ("workshop_image"."position" BETWEEN 0 AND 5),
	CONSTRAINT "workshop_image_alt_check" CHECK (btrim("workshop_image"."alt") <> '' AND length("workshop_image"."alt") <= 200)
);
--> statement-breakpoint
ALTER TABLE "workshop_image" ADD CONSTRAINT "workshop_image_workshop_id_monthly_workshop_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."monthly_workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_image" ADD CONSTRAINT "workshop_image_media_asset_id_media_asset_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_asset"("id") ON DELETE restrict ON UPDATE no action;