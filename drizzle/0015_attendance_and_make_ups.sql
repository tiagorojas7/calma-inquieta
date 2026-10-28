CREATE TABLE "attendance_make_up" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_email" text NOT NULL,
	"student_name" text NOT NULL,
	"period_id" uuid NOT NULL,
	"turno_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"make_up_period_id" uuid NOT NULL,
	"make_up_turno_id" uuid NOT NULL,
	"make_up_date" date NOT NULL,
	"status" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"done_by" text,
	"done_at" timestamp with time zone,
	CONSTRAINT "attendance_make_up_status_check" CHECK ("attendance_make_up"."status" IN ('pending', 'done')),
	CONSTRAINT "attendance_make_up_done_check" CHECK (("attendance_make_up"."status" = 'done') = ("attendance_make_up"."done_at" IS NOT NULL AND "attendance_make_up"."done_by" IS NOT NULL)),
	CONSTRAINT "attendance_make_up_email_check" CHECK ("attendance_make_up"."student_email" = lower(btrim("attendance_make_up"."student_email")) AND "attendance_make_up"."student_email" <> '')
);
--> statement-breakpoint
CREATE TABLE "attendance_mark" (
	"period_id" uuid NOT NULL,
	"turno_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"student_email" text NOT NULL,
	"status" text NOT NULL,
	"marked_by" text NOT NULL,
	"marked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "attendance_mark_pkey" PRIMARY KEY("period_id","turno_id","session_date","student_email"),
	CONSTRAINT "attendance_mark_status_check" CHECK ("attendance_mark"."status" IN ('present', 'absent')),
	CONSTRAINT "attendance_mark_email_check" CHECK ("attendance_mark"."student_email" = lower(btrim("attendance_mark"."student_email")) AND "attendance_mark"."student_email" <> '')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_make_up_absence_unique" ON "attendance_make_up" USING btree ("student_email","period_id","turno_id","session_date");--> statement-breakpoint
CREATE INDEX "attendance_make_up_status_idx" ON "attendance_make_up" USING btree ("status","make_up_date");--> statement-breakpoint
CREATE INDEX "attendance_mark_student_idx" ON "attendance_mark" USING btree ("student_email");