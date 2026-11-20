import { Money } from "~/modules/_shared";
import type { SeatDebt } from "~/modules/intensive-requests";

/** What an order is worth to a debt: a pending one is owed, a monthly fee or a sale alike. */
export interface DebtOrder {
  readonly status: string;
  readonly total: Money;
}

/**
 * What a student owes: every pending monthly fee and pending material sale,
 * plus the workshop deposits and balances still due. A paid or cancelled
 * order owes nothing.
 */
export function amountOwed(
  orders: readonly DebtOrder[],
  seatDebts: readonly SeatDebt[],
): Money {
  const pending = orders
    .filter((order) => order.status === "pending_confirmation")
    .reduce((sum, order) => sum.add(order.total), Money.zero());
  return seatDebts.reduce((sum, debt) => sum.add(debt.amount), pending);
}

/** The workshop payments still due, grouped by the email of who owes them. */
export function seatDebtsByEmail(
  debts: readonly SeatDebt[],
): ReadonlyMap<string, readonly SeatDebt[]> {
  const grouped = new Map<string, SeatDebt[]>();
  for (const debt of debts)
    grouped.set(debt.email, [...(grouped.get(debt.email) ?? []), debt]);
  return grouped;
}
