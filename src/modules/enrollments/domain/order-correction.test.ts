import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { planCorrection } from "./order-correction";
import type { OrderStatus } from "./order-core";

const pesos = (n: number): Money => {
  const money = Money.fromCentavos(n * 100);
  if (!money.ok) throw new Error("fixture");
  return money.value;
};

const TODAY = "2026-10-31";

const order = (
  status: OrderStatus,
  overrides: { fee?: number; materials?: number; paidOn?: string } = {},
) => {
  const fee = overrides.fee ?? 58_000;
  const materials = overrides.materials ?? 0;
  const paid = status !== "pending_confirmation" && status !== "cancelled";
  return {
    status,
    materialsTotal: pesos(materials),
    total: pesos(fee + materials),
    ...(paid
      ? {
          paidAmount: pesos(fee + materials),
          paidOn: overrides.paidOn ?? "2026-10-30",
        }
      : {}),
  };
};

describe("correction plan", () => {
  it("keeps a pending order pending whatever the new total", () => {
    const plan = planCorrection(
      order("pending_confirmation"),
      { fee: pesos(70_000), moved: true },
      TODAY,
    );
    expect(plan).toEqual({
      ok: true,
      value: {
        outcome: "kept-pending",
        status: "pending_confirmation",
        total: pesos(70_000),
        seat: "none",
      },
    });
  });

  it("adds the existing materials to the new fee", () => {
    const plan = planCorrection(
      order("pending_confirmation", { materials: 5_000 }),
      { fee: pesos(0), moved: false },
      TODAY,
    );
    expect(plan).toMatchObject({ ok: true, value: { total: pesos(5_000) } });
  });

  it.each(["paid", "materials_requested", "materials_received"] as const)(
    "keeps a %s order paid when the total is unchanged",
    (status) => {
      const same = planCorrection(
        order(status),
        { fee: pesos(58_000), moved: false },
        TODAY,
      );
      expect(same).toEqual({
        ok: true,
        value: {
          outcome: "kept-paid",
          status,
          total: pesos(58_000),
          seat: "none",
        },
      });
      const moved = planCorrection(
        order(status),
        { fee: pesos(58_000), moved: true },
        TODAY,
      );
      expect(moved).toMatchObject({
        ok: true,
        value: { outcome: "kept-paid", status, seat: "move" },
      });
    },
  );

  it.each(["paid", "materials_requested", "materials_received"] as const)(
    "returns a %s order to pending and releases its seat when the total rises",
    (status) => {
      for (const moved of [false, true])
        expect(
          planCorrection(order(status), { fee: pesos(60_000), moved }, TODAY),
        ).toEqual({
          ok: true,
          value: {
            outcome: "returned-to-pending",
            status: "pending_confirmation",
            total: pesos(60_000),
            seat: "release",
          },
        });
    },
  );

  it("keeps a lowered paid order paid and records the refunded difference", () => {
    const plan = planCorrection(
      order("materials_requested"),
      {
        fee: pesos(50_000),
        moved: false,
        refund: { amount: pesos(8_000), on: "2026-10-31" },
      },
      TODAY,
    );
    expect(plan).toEqual({
      ok: true,
      value: {
        outcome: "lowered",
        status: "materials_requested",
        total: pesos(50_000),
        seat: "none",
        refund: { amount: pesos(8_000), on: "2026-10-31" },
      },
    });
  });

  it("moves the seat of a lowered paid order that changes turno", () => {
    const plan = planCorrection(
      order("paid"),
      {
        fee: pesos(0),
        moved: true,
        refund: { amount: pesos(0), on: TODAY },
      },
      TODAY,
    );
    expect(plan).toMatchObject({
      ok: true,
      value: { outcome: "lowered", total: pesos(0), seat: "move" },
    });
  });

  it("bounds the refunded difference from $0 to the old total minus the new one", () => {
    const lowered = (amount: Money, on = TODAY) =>
      planCorrection(
        order("paid"),
        { fee: pesos(50_000), moved: false, refund: { amount, on } },
        TODAY,
      );
    expect(lowered(pesos(0)).ok).toBe(true);
    expect(lowered(pesos(8_000)).ok).toBe(true);
    expect(lowered(pesos(8_001))).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "amount",
        code: "above-difference",
      },
    });
    const negative = Money.fromCentavos(-100);
    if (!negative.ok) throw new Error("fixture");
    expect(lowered(negative.value)).toEqual({
      ok: false,
      error: { kind: "invalid-refund", field: "amount", code: "negative" },
    });
    const cents = Money.fromCentavos(150);
    if (!cents.ok) throw new Error("fixture");
    expect(lowered(cents.value)).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "amount",
        code: "not-whole-pesos",
      },
    });
  });

  it("dates the refund from the payment day to today", () => {
    const on = (date: string) =>
      planCorrection(
        order("paid", { paidOn: "2026-10-30" }),
        {
          fee: pesos(50_000),
          moved: false,
          refund: { amount: pesos(1_000), on: date },
        },
        TODAY,
      );
    expect(on("2026-10-30").ok).toBe(true);
    expect(on("2026-11-01")).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "refundedOn",
        code: "future-date",
      },
    });
    expect(on("2026-10-29")).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "refundedOn",
        code: "before-payment",
      },
    });
  });

  it("requires the refunded difference when a paid order's total drops", () => {
    expect(
      planCorrection(
        order("paid"),
        { fee: pesos(50_000), moved: false },
        TODAY,
      ),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-refund", field: "amount", code: "required" },
    });
  });

  it("refuses a refund when nothing was lowered or nothing was paid", () => {
    const refund = { amount: pesos(1_000), on: TODAY };
    const refused = {
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "amount",
        code: "not-refundable",
      },
    };
    expect(
      planCorrection(
        order("paid"),
        { fee: pesos(58_000), moved: false, refund },
        TODAY,
      ),
    ).toEqual(refused);
    expect(
      planCorrection(
        order("paid"),
        { fee: pesos(60_000), moved: false, refund },
        TODAY,
      ),
    ).toEqual(refused);
    expect(
      planCorrection(
        order("pending_confirmation"),
        { fee: pesos(1_000), moved: false, refund },
        TODAY,
      ),
    ).toEqual(refused);
  });

  it("refuses to correct a cancelled order", () => {
    expect(
      planCorrection(
        order("cancelled"),
        { fee: pesos(1_000), moved: false },
        TODAY,
      ),
    ).toEqual({ ok: false, error: { kind: "not-correctable" } });
  });

  it("refuses a fee that is not whole pesos or is negative", () => {
    const cents = Money.fromCentavos(150);
    const negative = Money.fromCentavos(-100);
    if (!cents.ok || !negative.ok) throw new Error("fixture");
    for (const fee of [cents.value, negative.value])
      expect(
        planCorrection(
          order("pending_confirmation"),
          { fee, moved: false },
          TODAY,
        ),
      ).toEqual({ ok: false, error: { kind: "invalid-fee" } });
  });
});
