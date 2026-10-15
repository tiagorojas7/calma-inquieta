CREATE TABLE "teacher" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"bio_line" text NOT NULL,
	"phone" text,
	"email" text,
	"modality" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "teacher_modality_check" CHECK ("teacher"."modality" IN ('own', 'third_party'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_active_name_unique" ON "teacher" USING btree ("name_key") WHERE "teacher"."active";