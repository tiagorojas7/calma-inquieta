import type { ReminderOrder } from "../domain/reminder-core";

/**
 * Read port over the enrollment orders the audience is selected from.
 * Satisfied by the order history reader of the enrollments module.
 */
export interface ReminderOrderSource {
  all(): Promise<readonly ReminderOrder[]>;
}
