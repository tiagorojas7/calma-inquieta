CREATE TABLE "material" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"category_key" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"image_asset_id" uuid,
	"image_alt" text,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "material_name_check" CHECK (btrim("material"."name") <> ''),
	CONSTRAINT "material_description_check" CHECK (btrim("material"."description") <> ''),
	CONSTRAINT "material_category_check" CHECK (btrim("material"."category") <> ''),
	CONSTRAINT "material_image_pair_check" CHECK (("material"."image_asset_id" IS NULL AND "material"."image_alt" IS NULL)
          OR ("material"."image_asset_id" IS NOT NULL AND "material"."image_alt" IS NOT NULL
              AND btrim("material"."image_alt") <> ''))
);
--> statement-breakpoint
CREATE TABLE "material_variant" (
	"id" uuid PRIMARY KEY NOT NULL,
	"material_id" uuid NOT NULL,
	"label" text NOT NULL,
	"label_key" text NOT NULL,
	"price_centavos" bigint NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"swatch" text,
	CONSTRAINT "material_variant_label_check" CHECK (btrim("material_variant"."label") <> ''),
	CONSTRAINT "material_variant_price_check" CHECK ("material_variant"."price_centavos" > 0),
	CONSTRAINT "material_variant_position_check" CHECK ("material_variant"."position" >= 0),
	CONSTRAINT "material_variant_swatch_check" CHECK ("material_variant"."swatch" IS NULL OR "material_variant"."swatch" ~ '^#[0-9a-f]{6}$')
);
--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_image_asset_id_media_asset_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."media_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_variant" ADD CONSTRAINT "material_variant_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "material_active_name_unique" ON "material" USING btree ("name_key") WHERE "material"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "material_variant_label_unique" ON "material_variant" USING btree ("material_id","label_key");--> statement-breakpoint
CREATE UNIQUE INDEX "material_variant_position_unique" ON "material_variant" USING btree ("material_id","position");