import type { AdminFailure, Invalid, Result } from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import type {
  AudienceFilter,
  ReminderField,
  ReminderInputs,
  ReminderKind,
} from "../domain/reminder-core";

export interface ReminderRequest {
  readonly kind: ReminderKind;
  readonly inputs: ReminderInputs;
  readonly filter: AudienceFilter;
}

/** One person to message. Without a valid phone there is no link. */
export interface ReminderRecipient {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  /** `https://wa.me/<digits>?text=...`, or null for "sin teléfono válido". */
  readonly link: string | null;
}

export interface ReminderBatch {
  /** The text with a first name filled in, for the owner to check. */
  readonly preview: string;
  readonly recipients: readonly ReminderRecipient[];
}

export interface ReminderOptions {
  /** `YYYY-MM`, newest first. */
  readonly periods: readonly string[];
  readonly turnos: readonly string[];
}

/** Read-only: messages are prepared for the owner to send, never sent. */
export interface RemindersService {
  options(actor: AdminActor): Promise<Result<ReminderOptions, AdminFailure>>;
  prepare(
    actor: AdminActor,
    request: ReminderRequest,
  ): Promise<Result<ReminderBatch, AdminFailure | Invalid<ReminderField>>>;
}
