import { describe, expect, it } from "vitest";
import type { SeatLedger } from "~/modules/enrollments/application/seat-ledger";

/** Behavior every seat ledger implementation must share. */
export function runSeatLedgerContract(
  setup: () => Promise<SeatLedger> | SeatLedger,
): void {
  describe("SeatLedger contract", () => {
    it("claims up to capacity and then reports turno-full", async () => {
      const ledger = await setup();
      await expect(ledger.claim("period-1", "turno-1", 2)).resolves.toEqual({
        ok: true,
        value: undefined,
      });
      await expect(ledger.claim("period-1", "turno-1", 2)).resolves.toEqual({
        ok: true,
        value: undefined,
      });
      await expect(ledger.claim("period-1", "turno-1", 2)).resolves.toEqual({
        ok: false,
        error: { kind: "turno-full" },
      });
      await expect(ledger.confirmedSeats("period-1", "turno-1")).resolves.toBe(
        2,
      );
    });

    it("refuses a claim when capacity is lowered below confirmed seats", async () => {
      const ledger = await setup();
      for (let i = 0; i < 6; i += 1) {
        await ledger.claim("period-1", "turno-1", 6);
      }
      await expect(ledger.claim("period-1", "turno-1", 5)).resolves.toEqual({
        ok: false,
        error: { kind: "turno-full" },
      });
      await expect(ledger.confirmedSeats("period-1", "turno-1")).resolves.toBe(
        6,
      );
    });

    it("releases one seat without ever going below zero", async () => {
      const ledger = await setup();
      await ledger.release("period-1", "turno-1");
      await ledger.release("period-1", "turno-1");
      await expect(ledger.confirmedSeats("period-1", "turno-1")).resolves.toBe(
        0,
      );
      await ledger.claim("period-1", "turno-1", 1);
      await ledger.release("period-1", "turno-1");
      await expect(ledger.confirmedSeats("period-1", "turno-1")).resolves.toBe(
        0,
      );
    });

    it("keeps counters independent per period and turno", async () => {
      const ledger = await setup();
      await ledger.claim("period-1", "turno-1", 1);
      await ledger.claim("period-1", "turno-2", 1);
      await ledger.claim("period-2", "turno-1", 1);
      await expect(ledger.confirmedSeats("period-1", "turno-1")).resolves.toBe(
        1,
      );
      await expect(ledger.confirmedSeats("period-1", "turno-2")).resolves.toBe(
        1,
      );
      await expect(ledger.confirmedSeats("period-2", "turno-1")).resolves.toBe(
        1,
      );
    });
  });
}
