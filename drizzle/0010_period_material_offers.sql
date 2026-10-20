CREATE TABLE "period_material_offer" (
	"period_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "period_material_offer_pkey" PRIMARY KEY("period_id","material_id"),
	CONSTRAINT "period_material_offer_period_id_position_unique" UNIQUE("period_id","position"),
	CONSTRAINT "period_material_offer_position_check" CHECK ("period_material_offer"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "period_material_offer" ADD CONSTRAINT "period_material_offer_period_id_workshop_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."workshop_period"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_material_offer" ADD CONSTRAINT "period_material_offer_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "period_material_offer_material_id_idx" ON "period_material_offer" USING btree ("material_id");