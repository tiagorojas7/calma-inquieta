CREATE TABLE "intensive_seat_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"intensive_id" uuid NOT NULL,
	"status" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_digits" text NOT NULL,
	"policy_accepted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"paid_centavos" integer,
	"paid_on" text,
	"payment_note" text,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"cancel_reason" text,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "intensive_seat_request_status_check" CHECK ("intensive_seat_request"."status" IN ('pending_confirmation', 'confirmed', 'cancelled')),
	CONSTRAINT "intensive_seat_request_confirmed_check" CHECK ("intensive_seat_request"."status" <> 'confirmed' OR ("intensive_seat_request"."paid_centavos" > 0 AND "intensive_seat_request"."paid_on" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "intensive_seat_request_public_id_unique" ON "intensive_seat_request" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intensive_seat_request_live_email_unique" ON "intensive_seat_request" USING btree ("intensive_id","email") WHERE "intensive_seat_request"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "intensive_seat_request_intensive_status_idx" ON "intensive_seat_request" USING btree ("intensive_id","status");