import { describe, expect, it } from "vitest";
import type { SeatLedger } from "~/modules/enrollments/application/seat-ledger";

const PERIOD_1 = "00000000-0000-4000-8000-000000000001";
const PERIOD_2 = "00000000-0000-4000-8000-000000000002";
const TURNO_1 = "00000000-0000-4000-8000-000000000011";
const TURNO_2 = "00000000-0000-4000-8000-000000000012";

/** Behavior every seat ledger implementation must share. */
export function runSeatLedgerContract(
  setup: () => Promise<SeatLedger> | SeatLedger,
): void {
  describe("SeatLedger contract", () => {
    it("starts at zero", async () => {
      const ledger = await setup();

      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_1)).resolves.toBe(0);
    });

    it("claims up to capacity and then reports turno-full", async () => {
      const ledger = await setup();
      await expect(ledger.claim(PERIOD_1, TURNO_1, 2)).resolves.toEqual({
        ok: true,
        value: undefined,
      });
      await expect(ledger.claim(PERIOD_1, TURNO_1, 2)).resolves.toEqual({
        ok: true,
        value: undefined,
      });
      await expect(ledger.claim(PERIOD_1, TURNO_1, 2)).resolves.toEqual({
        ok: false,
        error: { kind: "turno-full" },
      });
      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_1)).resolves.toBe(2);
    });

    it("refuses a claim when capacity is lowered below confirmed seats", async () => {
      const ledger = await setup();
      for (let i = 0; i < 6; i += 1) {
        await ledger.claim(PERIOD_1, TURNO_1, 6);
      }
      await expect(ledger.claim(PERIOD_1, TURNO_1, 5)).resolves.toEqual({
        ok: false,
        error: { kind: "turno-full" },
      });
      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_1)).resolves.toBe(6);
    });

    it("releases one seat without ever going below zero", async () => {
      const ledger = await setup();
      await ledger.release(PERIOD_1, TURNO_1);
      await ledger.release(PERIOD_1, TURNO_1);
      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_1)).resolves.toBe(0);
      await ledger.claim(PERIOD_1, TURNO_1, 1);
      await ledger.release(PERIOD_1, TURNO_1);
      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_1)).resolves.toBe(0);
    });

    it("keeps counters independent per period and turno", async () => {
      const ledger = await setup();
      await ledger.claim(PERIOD_1, TURNO_1, 1);
      await ledger.claim(PERIOD_1, TURNO_2, 1);
      await ledger.claim(PERIOD_2, TURNO_1, 1);
      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_1)).resolves.toBe(1);
      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_2)).resolves.toBe(1);
      await expect(ledger.confirmedSeats(PERIOD_2, TURNO_1)).resolves.toBe(1);
    });

    it("allows exactly the remaining capacity under concurrent claims", async () => {
      const ledger = await setup();
      await ledger.claim(PERIOD_1, TURNO_1, 3);

      const results = await Promise.all(
        Array.from({ length: 5 }, () => ledger.claim(PERIOD_1, TURNO_1, 3)),
      );

      expect(results.filter((result) => result.ok)).toHaveLength(2);
      expect(results.filter((result) => !result.ok)).toEqual([
        { ok: false, error: { kind: "turno-full" } },
        { ok: false, error: { kind: "turno-full" } },
        { ok: false, error: { kind: "turno-full" } },
      ]);
      await expect(ledger.confirmedSeats(PERIOD_1, TURNO_1)).resolves.toBe(3);
    });
  });
}
