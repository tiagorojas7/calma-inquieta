import type { SeatLedger } from "~/modules/enrollments/application/seat-ledger";

const keyOf = (periodId: string, turnoId: string): string =>
  `${periodId}|${turnoId}`;

export class InMemorySeatLedger implements SeatLedger {
  private readonly counters = new Map<string, number>();

  setConfirmed(periodId: string, turnoId: string, confirmed: number): void {
    this.counters.set(keyOf(periodId, turnoId), confirmed);
  }

  confirmedSeats(periodId: string, turnoId: string): Promise<number> {
    return Promise.resolve(this.counters.get(keyOf(periodId, turnoId)) ?? 0);
  }

  /** Every counter as `[key, confirmed]`, for "untouched" assertions. */
  snapshot(): [string, number][] {
    return [...this.counters.entries()];
  }
}
