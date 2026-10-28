import type { Money, Result } from "~/modules/_shared";
import type { EmailContent } from "../domain/email-templates";

export interface EmailMessage extends EmailContent {
  readonly to: string;
}

/** Why a send failed, by name only: never a body, address or key. */
export interface EmailSendFailure {
  readonly kind: string;
}

/** Outbound port for transactional email (adapter: Resend). */
export interface EmailSender {
  send(message: EmailMessage): Promise<Result<void, EmailSendFailure>>;
}

/** One order of the audience a scheduled reminder is addressed to. */
export interface AudienceOrder {
  readonly number: string;
  readonly publicId: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly workshopName: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoLabel: string;
  /** `HH:MM` or `HH:MM:SS`. */
  readonly startsAt: string;
  readonly total: Money;
}

/**
 * Read port over the enrollment orders reminders are derived from; satisfied
 * by the order audience reader of the enrollments module.
 */
export interface NotificationAudience {
  /** Orders of a student who paid and has a turno on this ISO weekday (1 = Monday) of the period. */
  classesOn(weekday: number, period: string): Promise<readonly AudienceOrder[]>;
  /** Orders still pending confirmation whose request instant is in `[from, to)`. */
  pendingRequestedBetween(
    from: Date,
    to: Date,
  ): Promise<readonly AudienceOrder[]>;
}
