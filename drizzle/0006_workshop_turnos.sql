CREATE TABLE "workshop_turno" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workshop_id" uuid NOT NULL,
	"label" text NOT NULL,
	"label_key" text NOT NULL,
	"weekday" smallint NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"default_capacity" integer NOT NULL,
	"active" boolean NOT NULL,
	CONSTRAINT "workshop_turno_weekday_check" CHECK ("workshop_turno"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "workshop_turno_time_range_check" CHECK ("workshop_turno"."ends_at" > "workshop_turno"."starts_at"),
	CONSTRAINT "workshop_turno_capacity_check" CHECK ("workshop_turno"."default_capacity" BETWEEN 1 AND 500)
);
--> statement-breakpoint
ALTER TABLE "workshop_turno" ADD CONSTRAINT "workshop_turno_workshop_id_monthly_workshop_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."monthly_workshop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_turno_workshop_label_key_unique" ON "workshop_turno" USING btree ("workshop_id","label_key");