import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  StudentOrderSource,
  StudentSourceOrder,
} from "~/modules/students";

export interface StudentOrderSourceHarness {
  readonly source: StudentOrderSource;
  /** Stores one order; the harness fills ids, numbers and the rest. */
  add(overrides?: Partial<StudentSourceOrder>): Promise<StudentSourceOrder>;
}

const total = Money.fromCentavos(5_800_000);
if (!total.ok) throw new Error("contract money fixture");
export const contractTotal = total.value;

/** Behavior every student order source implementation must share. */
export function runStudentOrderSourceContract(
  setup: () => Promise<StudentOrderSourceHarness> | StudentOrderSourceHarness,
): void {
  describe("StudentOrderSource contract", () => {
    it("returns nothing for an empty store", async () => {
      const { source } = await setup();
      await expect(source.all()).resolves.toEqual([]);
      await expect(source.byEmail("ana@example.com")).resolves.toEqual([]);
    });

    it("returns every stored order with its fields", async () => {
      const harness = await setup();
      const first = await harness.add({ studentEmail: "ana@example.com" });
      const second = await harness.add({ studentEmail: "bea@example.com" });

      const all = await harness.source.all();
      expect(all).toHaveLength(2);
      expect(all).toEqual(expect.arrayContaining([first, second]));
    });

    it("finds the orders of one student whatever the case or spacing asked for", async () => {
      const harness = await setup();
      const mine = await harness.add({ studentEmail: "ana@example.com" });
      await harness.add({ studentEmail: "bea@example.com" });

      await expect(
        harness.source.byEmail("  Ana@Example.com "),
      ).resolves.toEqual([mine]);
      await expect(harness.source.byEmail("zoe@example.com")).resolves.toEqual(
        [],
      );
    });
  });
}
