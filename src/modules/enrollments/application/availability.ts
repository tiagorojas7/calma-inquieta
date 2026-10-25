import { availableSeats as calculateAvailableSeats } from "../domain/order-core";
import type { SeatLedger } from "./seat-ledger";

export interface EnrollmentAvailabilityReader {
  availableSeats(
    periodId: string,
    turnoId: string,
    capacity: number,
  ): Promise<number>;
}

export function createAvailabilityReader(
  seats: Pick<SeatLedger, "confirmedSeats">,
): EnrollmentAvailabilityReader {
  return {
    async availableSeats(periodId, turnoId, capacity) {
      const confirmed = await seats.confirmedSeats(periodId, turnoId);
      return calculateAvailableSeats(capacity, confirmed);
    },
  };
}
