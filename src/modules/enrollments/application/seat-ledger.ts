import type { Result } from "~/modules/_shared";
import type { TurnoFull } from "../domain/order-core";

/** Seat counters per (period, turno). Pending orders never count. */
export interface SeatLedger {
  confirmedSeats(periodId: string, turnoId: string): Promise<number>;
  /** Atomically increments only while the supplied capacity has room. */
  claim(
    periodId: string,
    turnoId: string,
    capacity: number,
  ): Promise<Result<void, TurnoFull>>;
  /** A paid cancellation releases exactly one seat; it never goes below zero. */
  release(periodId: string, turnoId: string): Promise<void>;
}
