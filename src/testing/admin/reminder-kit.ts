import { createRemindersService } from "~/modules/reminders";
import type { ReminderOrder } from "~/modules/reminders";

/** Real reminders service over a mutable list of orders. */
export function remindersFixture() {
  const orders: ReminderOrder[] = [];
  const service = createRemindersService({
    orders: { all: () => Promise.resolve([...orders]) },
  });
  return { orders, service };
}
