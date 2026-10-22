CREATE TABLE "enrollment_order" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"number" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"workshop_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"period" text NOT NULL,
	"turno_id" uuid NOT NULL,
	"workshop_name" text NOT NULL,
	"turno_label" text NOT NULL,
	"weekday" integer NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"student_name" text NOT NULL,
	"student_email" text NOT NULL,
	"student_phone_digits" text NOT NULL,
	"fee_centavos" bigint NOT NULL,
	"materials_centavos" bigint NOT NULL,
	"total_centavos" bigint NOT NULL,
	"policy_version" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_amount_centavos" bigint,
	"payment_note" text,
	"confirmed_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"cancelled_by" text,
	CONSTRAINT "enrollment_order_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "enrollment_order_number_unique" UNIQUE("number"),
	CONSTRAINT "enrollment_order_status_check" CHECK ("enrollment_order"."status" IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received', 'cancelled')),
	CONSTRAINT "enrollment_order_source_check" CHECK ("enrollment_order"."source" = 'public'),
	CONSTRAINT "enrollment_order_period_check" CHECK ("enrollment_order"."period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "enrollment_order_weekday_check" CHECK ("enrollment_order"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "enrollment_order_time_range_check" CHECK ("enrollment_order"."ends_at" > "enrollment_order"."starts_at"),
	CONSTRAINT "enrollment_order_fee_check" CHECK ("enrollment_order"."fee_centavos" > 0),
	CONSTRAINT "enrollment_order_materials_check" CHECK ("enrollment_order"."materials_centavos" >= 0),
	CONSTRAINT "enrollment_order_total_check" CHECK ("enrollment_order"."total_centavos" = "enrollment_order"."fee_centavos" + "enrollment_order"."materials_centavos"),
	CONSTRAINT "enrollment_order_whole_pesos_check" CHECK ("enrollment_order"."fee_centavos" % 100 = 0
          AND "enrollment_order"."materials_centavos" % 100 = 0
          AND "enrollment_order"."total_centavos" % 100 = 0
          AND ("enrollment_order"."paid_amount_centavos" IS NULL OR "enrollment_order"."paid_amount_centavos" % 100 = 0)),
	CONSTRAINT "enrollment_order_paid_amount_check" CHECK ("enrollment_order"."paid_amount_centavos" IS NULL OR "enrollment_order"."paid_amount_centavos" = "enrollment_order"."total_centavos"),
	CONSTRAINT "enrollment_order_paid_state_check" CHECK (("enrollment_order"."status" = 'pending_confirmation'
            AND "enrollment_order"."paid_at" IS NULL
            AND "enrollment_order"."paid_amount_centavos" IS NULL)
          OR ("enrollment_order"."status" IN ('paid', 'materials_requested', 'materials_received')
            AND "enrollment_order"."paid_at" IS NOT NULL
            AND "enrollment_order"."paid_amount_centavos" IS NOT NULL)
          OR ("enrollment_order"."status" = 'cancelled'
            AND ("enrollment_order"."paid_at" IS NULL) = ("enrollment_order"."paid_amount_centavos" IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "order_audit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"actor" text NOT NULL,
	"from" text,
	"to" text NOT NULL,
	"note" text,
	CONSTRAINT "order_audit_from_check" CHECK ("order_audit"."from" IS NULL OR "order_audit"."from" IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received', 'cancelled')),
	CONSTRAINT "order_audit_to_check" CHECK ("order_audit"."to" IN ('pending_confirmation', 'paid', 'materials_requested', 'materials_received', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "order_line" (
	"order_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"material_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"material_name" text NOT NULL,
	"variant_label" text NOT NULL,
	"unit_price_centavos" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_name" text NOT NULL,
	CONSTRAINT "order_line_pkey" PRIMARY KEY("order_id","position"),
	CONSTRAINT "order_line_position_check" CHECK ("order_line"."position" >= 0),
	CONSTRAINT "order_line_quantity_check" CHECK ("order_line"."quantity" BETWEEN 1 AND 20),
	CONSTRAINT "order_line_unit_price_check" CHECK ("order_line"."unit_price_centavos" > 0 AND "order_line"."unit_price_centavos" % 100 = 0)
);
--> statement-breakpoint
CREATE TABLE "order_number_sequence" (
	"year" integer PRIMARY KEY NOT NULL,
	"last" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_number_sequence_year_check" CHECK ("order_number_sequence"."year" >= 2000),
	CONSTRAINT "order_number_sequence_last_check" CHECK ("order_number_sequence"."last" >= 0)
);
--> statement-breakpoint
CREATE TABLE "turno_seat_counter" (
	"period_id" uuid NOT NULL,
	"turno_id" uuid NOT NULL,
	"confirmed_seats" integer DEFAULT 0 NOT NULL,
	"capacity" integer NOT NULL,
	CONSTRAINT "turno_seat_counter_pkey" PRIMARY KEY("period_id","turno_id"),
	CONSTRAINT "turno_seat_counter_confirmed_seats_check" CHECK ("turno_seat_counter"."confirmed_seats" >= 0 AND "turno_seat_counter"."confirmed_seats" <= "turno_seat_counter"."capacity"),
	CONSTRAINT "turno_seat_counter_capacity_check" CHECK ("turno_seat_counter"."capacity" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_audit" ADD CONSTRAINT "order_audit_order_id_enrollment_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."enrollment_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_order_id_enrollment_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."enrollment_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_order_active_duplicate_unique" ON "enrollment_order" USING btree ("student_email","workshop_id","period_id") WHERE "enrollment_order"."status" <> 'cancelled';