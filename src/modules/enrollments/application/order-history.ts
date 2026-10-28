import type { Money } from "~/modules/_shared";
import type { OrderStatus } from "../domain/order-core";

/** What other modules may read about an order: no lines, audit or payment notes. */
export interface OrderHistoryRow {
  readonly id: string;
  readonly number: string;
  readonly status: OrderStatus;
  readonly requestedAt: Date;
  readonly paidAt: Date | null;
  readonly total: Money;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly turnoLabel: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly studentPhoneDigits: string;
}

/** Read-only order history. `byEmail` matches the email trimmed and lower-cased. */
export interface OrderHistoryReader {
  all(): Promise<readonly OrderHistoryRow[]>;
  byEmail(email: string): Promise<readonly OrderHistoryRow[]>;
}
