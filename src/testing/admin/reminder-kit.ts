import { createRemindersService } from "~/modules/reminders";
import type { ReminderOrder } from "~/modules/reminders";

/** Real reminders service over a mutable list of orders. */
export function remindersFixture() {
  const orders: ReminderOrder[] = [];
  const service = createRemindersService({
    orders: { all: () => Promise.resolve([...orders]) },
    clock: { now: () => new Date("2026-10-05T15:00:00Z") },
  });
  return { orders, service };
}
