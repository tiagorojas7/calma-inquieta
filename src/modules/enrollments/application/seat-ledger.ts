/**
 * Seat counters per (period, turno). Slice E2 only reads; the claim and the
 * release arrive with the admin application (E3). Pending orders never count.
 */
export interface SeatLedger {
  confirmedSeats(periodId: string, turnoId: string): Promise<number>;
}
