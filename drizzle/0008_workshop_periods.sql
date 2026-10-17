CREATE TABLE "period_turno" (
	"period_id" uuid NOT NULL,
	"turno_id" uuid NOT NULL,
	"workshop_id" uuid NOT NULL,
	"capacity" integer NOT NULL,
	CONSTRAINT "period_turno_pkey" PRIMARY KEY("period_id","turno_id"),
	CONSTRAINT "period_turno_capacity_check" CHECK ("period_turno"."capacity" BETWEEN 1 AND 500)
);
--> statement-breakpoint
CREATE TABLE "workshop_period" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workshop_id" uuid NOT NULL,
	"period" char(7) NOT NULL,
	"fee_centavos" bigint NOT NULL,
	"materials_required" boolean NOT NULL,
	"project_title" text,
	"project_description" text,
	"snapshot_teacher_id" uuid NOT NULL,
	"snapshot_teacher_modality" text NOT NULL,
	"snapshot_percentage_bp" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"opened_by" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workshop_period_workshop_period_unique" UNIQUE("workshop_id","period"),
	CONSTRAINT "workshop_period_workshop_id_unique" UNIQUE("workshop_id","id"),
	CONSTRAINT "workshop_period_period_check" CHECK ("workshop_period"."period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "workshop_period_fee_check" CHECK ("workshop_period"."fee_centavos" > 0),
	CONSTRAINT "workshop_period_snapshot_modality_check" CHECK ("workshop_period"."snapshot_teacher_modality" IN ('own', 'third_party')),
	CONSTRAINT "workshop_period_snapshot_percentage_check" CHECK ("workshop_period"."snapshot_percentage_bp" IS NULL OR "workshop_period"."snapshot_percentage_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "workshop_period_snapshot_percentage_modality_check" CHECK (("workshop_period"."snapshot_teacher_modality" = 'third_party') = ("workshop_period"."snapshot_percentage_bp" IS NOT NULL)),
	CONSTRAINT "workshop_period_status_check" CHECK ("workshop_period"."status" IN ('draft', 'open', 'closed'))
);
--> statement-breakpoint
ALTER TABLE "period_turno" ADD CONSTRAINT "period_turno_workshop_period_fk" FOREIGN KEY ("workshop_id","period_id") REFERENCES "public"."workshop_period"("workshop_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_turno" ADD CONSTRAINT "period_turno_workshop_turno_fk" FOREIGN KEY ("workshop_id","turno_id") REFERENCES "public"."workshop_turno"("workshop_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_period" ADD CONSTRAINT "workshop_period_workshop_id_monthly_workshop_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."monthly_workshop"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_period" ADD CONSTRAINT "workshop_period_snapshot_teacher_id_teacher_id_fk" FOREIGN KEY ("snapshot_teacher_id") REFERENCES "public"."teacher"("id") ON DELETE restrict ON UPDATE no action;