CREATE TABLE "student_note" (
	"email" text PRIMARY KEY NOT NULL,
	"note" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "student_note_email_check" CHECK ("student_note"."email" = lower(btrim("student_note"."email")) AND "student_note"."email" <> ''),
	CONSTRAINT "student_note_length_check" CHECK (char_length("student_note"."note") <= 2000)
);
