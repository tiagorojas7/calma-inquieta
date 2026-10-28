CREATE TABLE "private_event_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"full_name" text NOT NULL,
	"phone_digits" text NOT NULL,
	"email" text,
	"desired_date" text NOT NULL,
	"place" text NOT NULL,
	"participants" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"status_changed_by" text,
	"status_changed_at" timestamp with time zone,
	CONSTRAINT "private_event_request_status_check" CHECK ("private_event_request"."status" IN ('nueva', 'contactada', 'cerrada')),
	CONSTRAINT "private_event_request_participants_check" CHECK ("private_event_request"."participants" BETWEEN 1 AND 200)
);
--> statement-breakpoint
CREATE INDEX "private_event_request_status_created_idx" ON "private_event_request" USING btree ("status","created_at");