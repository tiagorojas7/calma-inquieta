import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  snapshotOf,
  type AdminEnrollmentStore,
  type CorrectionTarget,
} from "~/modules/enrollments/application/admin-enrollment-store";
import type { StoredOrder } from "~/modules/enrollments/application/enrollment-repository";
import type { AdminEnrollmentStoreContractHarness } from "./admin-enrollment-store.contract";

const pesos = (amount: number) => {
  const result = Money.fromCentavos(amount * 100);
  if (!result.ok) throw new Error("contract money fixture");
  return result.value;
};

const actor = { email: "admin@example.com" };
const now = new Date("2026-10-31T15:00:00Z");
const paidAt = new Date("2026-10-30T15:00:00Z");
/** Later than every earlier write, so the audit order does not depend on ids. */
const later = new Date("2026-10-31T16:00:00Z");

type CorrectInput = Parameters<AdminEnrollmentStore["correct"]>[0];
type Change = Omit<CorrectInput, "orderId" | "actor" | "now"> & {
  readonly now?: Date;
};

const correct = (
  store: AdminEnrollmentStore,
  order: StoredOrder,
  change: Change,
) =>
  store.correct({
    orderId: order.id,
    actor,
    ...change,
    now: change.now ?? now,
  });

const confirm = (store: AdminEnrollmentStore, order: StoredOrder) =>
  store.confirm({
    orderId: order.id,
    amount: order.total,
    paidAt,
    note: "bank transfer",
    actor,
    now,
  });

/** The workshop, month and turno another order already sits in. */
const targetOf = (order: StoredOrder): CorrectionTarget => ({
  workshopId: order.workshopId,
  workshopName: order.workshopName,
  periodId: order.periodId,
  period: order.period,
  turnoId: order.turnoId,
  turnoLabel: order.turnoLabel,
  weekday: order.weekday,
  startsAt: order.startsAt,
  endsAt: order.endsAt,
});

const materialLine = {
  materialId: "m-1",
  variantId: "v-1",
  materialName: "Clay",
  variantLabel: "Large",
  unitPrice: pesos(1_000),
  quantity: 2,
  supplierId: "supplier-1",
  supplierName: "Supplier",
};

/** Behavior every transactional admin enrollment store must share when it corrects an order. */
export function runAdminEnrollmentCorrectionContract(
  setup: () =>
    | Promise<AdminEnrollmentStoreContractHarness>
    | AdminEnrollmentStoreContractHarness,
): void {
  describe("AdminEnrollmentStore correction contract", () => {
    const detailOf = async (
      harness: AdminEnrollmentStoreContractHarness,
      order: StoredOrder,
    ) => {
      const detail = await harness.store.detail(order.id);
      if (!detail.ok) throw new Error("expected detail");
      return detail.value;
    };

    it("applies a correction to a pending order, keeps it pending and holds no seat", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      const other = await harness.createOrder({ turnoId: "t-2" });
      const audit = await harness.audit(order);

      await expect(
        correct(harness.store, order, {
          target: targetOf(other),
          fee: pesos(70_000),
          note: "moved to the other turno",
        }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "kept-pending" },
      });

      const detail = await detailOf(harness, order);
      expect(detail).toMatchObject({
        status: "pending_confirmation",
        turnoId: other.turnoId,
        turnoLabel: other.turnoLabel,
        fee: pesos(70_000),
        total: pesos(70_000),
      });
      expect(detail.paidAt).toBeUndefined();
      await expect(harness.seatCount(order)).resolves.toBe(0);
      await expect(harness.seatCount(other)).resolves.toBe(0);
      await expect(harness.audit(order)).resolves.toEqual(audit);
      expect(detail.corrections).toEqual([
        {
          id: expect.any(String) as string,
          at: now,
          actor: actor.email,
          note: "moved to the other turno",
          before: snapshotOf(order),
          after: {
            ...targetOf(other),
            fee: pesos(70_000),
            total: pesos(70_000),
            status: "pending_confirmation",
          },
          previousPayment: null,
          refund: null,
        },
      ]);
    });

    it("keeps a paid order paid and its seat when the total is unchanged, and records the correction", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);

      await expect(
        correct(harness.store, order, { fee: order.fee }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "kept-paid" },
      });

      const detail = await detailOf(harness, order);
      expect(detail).toMatchObject({
        status: "paid",
        paidAt,
        paidAmount: order.total,
        confirmedBy: actor.email,
      });
      await expect(harness.seatCount(order)).resolves.toBe(1);
      expect(detail.corrections).toHaveLength(1);
      expect(detail.corrections[0]).toMatchObject({
        before: { status: "paid" },
        after: { status: "paid" },
        previousPayment: null,
        refund: null,
      });
      await expect(harness.audit(order)).resolves.toHaveLength(2);
    });

    it("returns a paid order to pending when the total rises, releases its seat and keeps the previous payment", async () => {
      const harness = await setup();
      const order = await harness.createOrder({
        lines: [materialLine],
        materialsTotal: pesos(2_000),
        total: pesos(60_000),
      });
      await confirm(harness.store, order);
      await harness.store.markMaterials({
        orderId: order.id,
        to: "materials_requested",
        actor,
        now,
      });
      await expect(harness.seatCount(order)).resolves.toBe(1);

      await expect(
        correct(harness.store, order, {
          fee: pesos(60_000),
          note: "the fee was wrong",
          now: later,
        }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "returned-to-pending" },
      });

      const detail = await detailOf(harness, order);
      expect(detail).toMatchObject({
        status: "pending_confirmation",
        fee: pesos(60_000),
        materialsTotal: pesos(2_000),
        total: pesos(62_000),
      });
      expect(detail.lines).toHaveLength(1);
      expect(detail.paidAt).toBeUndefined();
      expect(detail.paidAmount).toBeUndefined();
      expect(detail.confirmedBy).toBeUndefined();
      await expect(harness.seatCount(order)).resolves.toBe(0);
      expect(detail.audit.at(-1)).toEqual({
        at: later,
        actor: actor.email,
        from: "materials_requested",
        to: "pending_confirmation",
        note: "the fee was wrong",
      });
      expect(detail.corrections).toEqual([
        expect.objectContaining({
          before: expect.objectContaining({
            status: "materials_requested",
            total: pesos(60_000),
          }) as unknown,
          after: expect.objectContaining({
            status: "pending_confirmation",
            total: pesos(62_000),
          }) as unknown,
          previousPayment: {
            amount: pesos(60_000),
            paidAt,
            confirmedBy: actor.email,
          },
          refund: null,
        }),
      ]);
    });

    it("asks for the new total after a raise and confirms it like any pending order", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);
      await correct(harness.store, order, { fee: pesos(60_000) });

      await expect(confirm(harness.store, order)).resolves.toEqual({
        ok: false,
        error: { kind: "amount-mismatch" },
      });
      await expect(
        harness.store.confirm({
          orderId: order.id,
          amount: pesos(60_000),
          paidAt: new Date("2026-10-31T12:00:00Z"),
          actor,
          now,
        }),
      ).resolves.toEqual({ ok: true, value: { kind: "confirmed" } });
      await expect(harness.seatCount(order)).resolves.toBe(1);
      await expect(detailOf(harness, order)).resolves.toMatchObject({
        status: "paid",
        paidAmount: pesos(60_000),
      });
    });

    it("does not claim the new seat when a raise also moves the order", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      const other = await harness.createOrder({ turnoId: "t-2" });
      await confirm(harness.store, order);

      await expect(
        correct(harness.store, order, {
          target: targetOf(other),
          fee: pesos(60_000),
        }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "returned-to-pending" },
      });

      await expect(harness.seatCount(order)).resolves.toBe(0);
      await expect(harness.seatCount(other)).resolves.toBe(0);
      await expect(detailOf(harness, order)).resolves.toMatchObject({
        status: "pending_confirmation",
        turnoId: other.turnoId,
      });
    });

    it("keeps a paid order paid when the total drops and records the refunded difference", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);

      await expect(
        correct(harness.store, order, {
          fee: pesos(50_000),
          refund: {
            amount: pesos(5_000),
            refundedOn: "2026-10-31",
            note: "returned in cash",
          },
          note: "scholarship",
        }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "lowered" },
      });

      const detail = await detailOf(harness, order);
      expect(detail).toMatchObject({
        status: "paid",
        fee: pesos(50_000),
        total: pesos(50_000),
        paidAt,
        paidAmount: pesos(50_000),
        confirmedBy: actor.email,
      });
      expect(detail.refund).toBeUndefined();
      await expect(harness.seatCount(order)).resolves.toBe(1);
      await expect(harness.audit(order)).resolves.toHaveLength(2);
      expect(detail.corrections).toEqual([
        expect.objectContaining({
          note: "scholarship",
          before: expect.objectContaining({ total: pesos(58_000) }) as unknown,
          after: expect.objectContaining({
            total: pesos(50_000),
            status: "paid",
          }) as unknown,
          previousPayment: null,
          refund: {
            amount: pesos(5_000),
            refundedAt: new Date("2026-10-31T03:00:00.000Z"),
            note: "returned in cash",
          },
        }),
      ]);
    });

    it("accepts a $0 fee and a refund of nothing or of the whole difference", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      const second = await harness.createOrder();
      await confirm(harness.store, order);
      await confirm(harness.store, second);

      await expect(
        correct(harness.store, order, {
          fee: pesos(0),
          refund: { amount: pesos(0), refundedOn: "2026-10-30" },
        }),
      ).resolves.toMatchObject({ ok: true });
      await expect(
        correct(harness.store, second, {
          fee: pesos(0),
          refund: { amount: pesos(58_000), refundedOn: "2026-10-31" },
        }),
      ).resolves.toMatchObject({ ok: true });

      const detail = await detailOf(harness, order);
      expect(detail.paidAmount?.isZero()).toBe(true);
      expect(detail.corrections[0]?.refund?.amount.isZero()).toBe(true);
    });

    it.each([
      ["above the difference", pesos(8_001), "2026-10-31", "above-difference"],
      ["future dated", pesos(1_000), "2026-11-01", "future-date"],
      ["before the payment", pesos(1_000), "2026-10-29", "before-payment"],
    ] as const)(
      "refuses a refund that is %s and changes nothing",
      async (_label, amount, refundedOn, code) => {
        const harness = await setup();
        const order = await harness.createOrder();
        await confirm(harness.store, order);
        const before = await detailOf(harness, order);

        const result = await correct(harness.store, order, {
          fee: pesos(50_000),
          refund: { amount, refundedOn },
        });

        expect(result).toMatchObject({
          ok: false,
          error: { kind: "invalid-refund", code },
        });
        await expect(detailOf(harness, order)).resolves.toEqual(before);
        await expect(harness.seatCount(order)).resolves.toBe(1);
      },
    );

    it("refuses a lowered paid order without a refund and a refund with nothing lowered", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);
      const before = await detailOf(harness, order);

      await expect(
        correct(harness.store, order, { fee: pesos(50_000) }),
      ).resolves.toEqual({
        ok: false,
        error: { kind: "invalid-refund", field: "amount", code: "required" },
      });
      await expect(
        correct(harness.store, order, {
          fee: pesos(58_000),
          refund: { amount: pesos(1), refundedOn: "2026-10-31" },
        }),
      ).resolves.toEqual({
        ok: false,
        error: {
          kind: "invalid-refund",
          field: "amount",
          code: "not-refundable",
        },
      });
      await expect(detailOf(harness, order)).resolves.toEqual(before);
    });

    it("moves a paid order's seat to the new turno in one step", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      const other = await harness.createOrder({ turnoId: "t-2" });
      await confirm(harness.store, order);

      await expect(
        correct(harness.store, order, {
          target: targetOf(other),
          fee: order.fee,
        }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "kept-paid" },
      });

      await expect(harness.seatCount(order)).resolves.toBe(0);
      await expect(harness.seatCount(other)).resolves.toBe(1);
      await expect(detailOf(harness, order)).resolves.toMatchObject({
        status: "paid",
        turnoId: other.turnoId,
        turnoLabel: other.turnoLabel,
      });
    });

    it("moves a paid order to another month and releases the old month's seat", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      const nextMonth = await harness.createOrder({
        periodId: "p-2",
        period: "2026-11",
      });
      await confirm(harness.store, order);

      await expect(
        correct(harness.store, order, {
          target: targetOf(nextMonth),
          fee: order.fee,
        }),
      ).resolves.toMatchObject({ ok: true });

      await expect(harness.seatCount(order)).resolves.toBe(0);
      await expect(harness.seatCount(nextMonth)).resolves.toBe(1);
      await expect(detailOf(harness, order)).resolves.toMatchObject({
        period: "2026-11",
        periodId: nextMonth.periodId,
      });
    });

    it("refuses everything when the target turno is full", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);
      const fillers: StoredOrder[] = [];
      for (let seat = 0; seat < harness.capacity; seat += 1) {
        const filler = await harness.createOrder({ turnoId: "t-2" });
        await confirm(harness.store, filler);
        fillers.push(filler);
      }
      const target = fillers[0];
      if (!target) throw new Error("missing target");
      const before = await detailOf(harness, order);
      const audit = await harness.audit(order);

      await expect(
        correct(harness.store, order, {
          target: targetOf(target),
          fee: pesos(50_000),
          refund: { amount: pesos(1_000), refundedOn: "2026-10-31" },
        }),
      ).resolves.toEqual({ ok: false, error: { kind: "turno-full" } });

      await expect(detailOf(harness, order)).resolves.toEqual(before);
      await expect(harness.audit(order)).resolves.toEqual(audit);
      await expect(harness.seatCount(order)).resolves.toBe(1);
      await expect(harness.seatCount(target)).resolves.toBe(harness.capacity);
    });

    it("refuses a move into a month the student already holds", async () => {
      const harness = await setup();
      const student = {
        fullName: "Same Student",
        email: "same-student@example.com",
        phoneDigits: "5493515550101",
      };
      const october = await harness.createOrder({ student });
      const november = await harness.createOrder({
        student,
        periodId: "p-2",
        period: "2026-11",
      });
      await confirm(harness.store, october);
      const before = await detailOf(harness, october);

      await expect(
        correct(harness.store, october, {
          target: targetOf(november),
          fee: october.fee,
        }),
      ).resolves.toEqual({ ok: false, error: { kind: "duplicate-order" } });

      await expect(detailOf(harness, october)).resolves.toEqual(before);
      await expect(harness.seatCount(october)).resolves.toBe(1);
      await expect(harness.seatCount(november)).resolves.toBe(0);
    });

    it("allows the month again once the student's other order there is cancelled", async () => {
      const harness = await setup();
      const student = {
        fullName: "Freed Month",
        email: "freed-month@example.com",
        phoneDigits: "5493515550102",
      };
      const october = await harness.createOrder({ student });
      const november = await harness.createOrder({
        student,
        periodId: "p-2",
        period: "2026-11",
      });
      await harness.store.cancel({
        orderId: november.id,
        reason: "changed plans",
        actor,
        now,
      });

      await expect(
        correct(harness.store, october, {
          target: targetOf(november),
          fee: october.fee,
        }),
      ).resolves.toMatchObject({ ok: true });
    });

    it("cannot correct a cancelled order or an unknown one", async () => {
      const harness = await setup();
      const pending = await harness.createOrder();
      await harness.store.cancel({
        orderId: pending.id,
        reason: "changed plans",
        actor,
        now,
      });
      const before = await detailOf(harness, pending);

      await expect(
        correct(harness.store, pending, { fee: pesos(1) }),
      ).resolves.toEqual({ ok: false, error: { kind: "not-correctable" } });
      await expect(
        harness.store.correct({
          orderId: "00000000-0000-4000-8000-00000000ffff",
          fee: pesos(1),
          actor,
          now,
        }),
      ).resolves.toEqual({ ok: false, error: { kind: "not-found" } });
      await expect(detailOf(harness, pending)).resolves.toEqual(before);

      const paid = await harness.createOrder();
      await confirm(harness.store, paid);
      await harness.store.cancel({
        orderId: paid.id,
        reason: "changed plans",
        refund: { amount: pesos(0), refundedOn: "2026-10-31" },
        actor,
        now,
      });
      await expect(
        correct(harness.store, paid, { fee: pesos(1) }),
      ).resolves.toEqual({ ok: false, error: { kind: "not-correctable" } });
    });

    it("refuses a fee that is not whole pesos", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      const cents = Money.fromCentavos(150);
      if (!cents.ok) throw new Error("fixture");
      const before = await detailOf(harness, order);

      await expect(
        correct(harness.store, order, { fee: cents.value }),
      ).resolves.toEqual({ ok: false, error: { kind: "invalid-fee" } });
      await expect(detailOf(harness, order)).resolves.toEqual(before);
    });

    it("keeps every correction, oldest first, and never rewrites an earlier one", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);

      await correct(harness.store, order, {
        fee: pesos(60_000),
        note: "first",
        now: new Date("2026-10-31T15:00:00Z"),
      });
      await correct(harness.store, order, {
        fee: pesos(55_000),
        note: "second",
        now: new Date("2026-10-31T16:00:00Z"),
      });

      const detail = await detailOf(harness, order);
      expect(detail.corrections.map((entry) => entry.note)).toEqual([
        "first",
        "second",
      ]);
      expect(detail.corrections[0]?.after.total).toEqual(pesos(60_000));
      expect(detail.corrections[1]?.before).toMatchObject({
        status: "pending_confirmation",
        total: pesos(60_000),
      });
      expect(detail.corrections[1]?.after.total).toEqual(pesos(55_000));
    });

    it("leaves confirm, cancel and refund working on a corrected order", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);
      await correct(harness.store, order, {
        fee: pesos(50_000),
        refund: { amount: pesos(8_000), refundedOn: "2026-10-31" },
      });

      await expect(confirm(harness.store, order)).resolves.toEqual({
        ok: true,
        value: { kind: "already-confirmed" },
      });
      await expect(
        harness.store.cancel({
          orderId: order.id,
          reason: "changed plans",
          refund: { amount: pesos(50_001), refundedOn: "2026-10-31" },
          actor,
          now,
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { kind: "invalid-refund", code: "above-paid" },
      });
      await expect(
        harness.store.cancel({
          orderId: order.id,
          reason: "changed plans",
          refund: { amount: pesos(50_000), refundedOn: "2026-10-31" },
          actor,
          now,
        }),
      ).resolves.toEqual({ ok: true, value: { kind: "cancelled" } });

      await expect(harness.seatCount(order)).resolves.toBe(0);
      const detail = await detailOf(harness, order);
      expect(detail).toMatchObject({
        status: "cancelled",
        paidAmount: pesos(50_000),
        refund: { amount: pesos(50_000) },
      });
      expect(detail.corrections).toHaveLength(1);
    });
  });
}
