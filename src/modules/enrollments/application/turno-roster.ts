import type { OrderStatus } from "../domain/order-core";

/** One student with an active order for a period and turno. */
export interface TurnoRosterEntry {
  /** Normalized (trimmed, lower-cased). */
  readonly email: string;
  readonly name: string;
  readonly orderNumber: string;
  /** The order is paid or beyond: the monthly fee is settled. */
  readonly feePaid: boolean;
}

/** Read-only roster of a period and turno, without cancelled orders. */
export interface TurnoRosterReader {
  /** Ordered by student name, then order number. */
  forTurno(
    periodId: string,
    turnoId: string,
  ): Promise<readonly TurnoRosterEntry[]>;
}

/** Only an order still waiting for confirmation has an unsettled fee. */
export function rosterFeePaid(status: OrderStatus): boolean {
  return status !== "pending_confirmation";
}
