import type { SeatLedger } from "~/modules/enrollments";
import type { ConfirmedSeatsLookup } from "~/modules/workshops";

/** Adapts enrollment's seat ledger to workshops' capacity-floor lookup. */
export function createConfirmedSeatsAdapter(
  seats: Pick<SeatLedger, "confirmedSeats">,
): ConfirmedSeatsLookup {
  return {
    confirmedSeats: (periodId, turnoId) =>
      seats.confirmedSeats(periodId, turnoId),
  };
}
