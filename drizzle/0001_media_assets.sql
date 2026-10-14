CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "media_asset_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_asset_content_type_check" CHECK ("media_asset"."content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "media_asset_byte_size_check" CHECK ("media_asset"."byte_size" BETWEEN 1 AND 5242880),
	CONSTRAINT "media_asset_width_check" CHECK ("media_asset"."width" BETWEEN 1 AND 10000),
	CONSTRAINT "media_asset_height_check" CHECK ("media_asset"."height" BETWEEN 1 AND 10000)
);
