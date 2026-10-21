import { err, ok } from "~/modules/_shared";
import type { SeatLedger } from "~/modules/enrollments/application/seat-ledger";

const keyOf = (periodId: string, turnoId: string): string =>
  `${periodId}|${turnoId}`;

export class InMemorySeatLedger implements SeatLedger {
  private readonly counters = new Map<string, number>();
  private readonly tails = new Map<string, Promise<void>>();
  private calls = 0;

  setConfirmed(periodId: string, turnoId: string, confirmed: number): void {
    this.counters.set(keyOf(periodId, turnoId), confirmed);
  }

  confirmedSeats(periodId: string, turnoId: string): Promise<number> {
    this.calls += 1;
    return Promise.resolve(this.counters.get(keyOf(periodId, turnoId)) ?? 0);
  }

  callCount(): number {
    return this.calls;
  }

  private async atomic<T>(key: string, work: () => T | Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }

  claim(periodId: string, turnoId: string, capacity: number) {
    this.calls += 1;
    const key = keyOf(periodId, turnoId);
    return this.atomic(key, () => {
      const confirmed = this.counters.get(key) ?? 0;
      if (confirmed >= capacity) return err({ kind: "turno-full" as const });
      this.counters.set(key, confirmed + 1);
      return ok(undefined);
    });
  }

  release(periodId: string, turnoId: string): Promise<void> {
    this.calls += 1;
    const key = keyOf(periodId, turnoId);
    return this.atomic(key, () => {
      this.counters.set(key, Math.max(0, (this.counters.get(key) ?? 0) - 1));
    });
  }

  /** Every counter as `[key, confirmed]`, for "untouched" assertions. */
  snapshot(): [string, number][] {
    return [...this.counters.entries()];
  }
}
