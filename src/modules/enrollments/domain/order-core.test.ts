import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  ORDER_STATUSES,
  availableSeats,
  cancelOutcome,
  checkPaymentAmount,
  checkRefund,
  confirmOutcome,
  cordobaYearOf,
  formatOrderNumber,
  fulfillmentOf,
  generatePublicId,
  holdsSeat,
  isPublicId,
  lineSourceFor,
  priceOrder,
  releasesSeat,
  seatClaim,
  transition,
  type OrderStatus,
} from "./order-core";

const pesos = (n: number): Money => {
  const money = Money.fromCentavos(n * 100);
  if (!money.ok) throw new Error("fixture");
  return money.value;
};

const ALLOWED: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
  ["pending_confirmation", "paid"],
  ["pending_confirmation", "cancelled"],
  ["paid", "materials_requested"],
  ["paid", "cancelled"],
  ["materials_requested", "materials_received"],
  ["materials_requested", "cancelled"],
  ["materials_received", "cancelled"],
];

describe("order transitions", () => {
  it("lists the five states", () => {
    expect([...ORDER_STATUSES]).toEqual([
      "pending_confirmation",
      "paid",
      "materials_requested",
      "materials_received",
      "cancelled",
    ]);
  });

  it.each(ALLOWED)("allows %s -> %s", (from, to) => {
    expect(transition(from, to, { hasMaterialLines: true })).toEqual({
      ok: true,
      value: to,
    });
  });

  const illegal = ORDER_STATUSES.flatMap((from) =>
    ORDER_STATUSES.filter(
      (to) => !ALLOWED.some(([f, t]) => f === from && t === to),
    ).map((to) => [from, to] as const),
  );

  it.each(illegal)("refuses %s -> %s naming both states", (from, to) => {
    expect(transition(from, to, { hasMaterialLines: true })).toEqual({
      ok: false,
      error: { kind: "illegal-transition", from, to },
    });
  });

  it("requires material lines to request materials", () => {
    expect(
      transition("paid", "materials_requested", { hasMaterialLines: false }),
    ).toEqual({
      ok: false,
      error: {
        kind: "illegal-transition",
        from: "paid",
        to: "materials_requested",
      },
    });
  });

  describe("an order with only stock lines", () => {
    const stockOnly = { hasMaterialLines: true, hasSupplierLines: false };

    it("goes from paid straight to received", () => {
      expect(transition("paid", "materials_received", stockOnly)).toEqual({
        ok: true,
        value: "materials_received",
      });
    });

    it("still may be marked requested", () => {
      expect(transition("paid", "materials_requested", stockOnly).ok).toBe(
        true,
      );
    });

    it("keeps the supplier path while a supplier line exists", () => {
      expect(
        transition("paid", "materials_received", {
          hasMaterialLines: true,
          hasSupplierLines: true,
        }).ok,
      ).toBe(false);
    });

    it("never skips requested for an order without lines", () => {
      expect(
        transition("paid", "materials_received", {
          hasMaterialLines: false,
          hasSupplierLines: false,
        }).ok,
      ).toBe(false);
    });

    it("never skips the payment", () => {
      expect(
        transition("pending_confirmation", "materials_received", stockOnly).ok,
      ).toBe(false);
    });
  });

  it("keeps cancelled terminal", () => {
    for (const to of ORDER_STATUSES) {
      expect(transition("cancelled", to, { hasMaterialLines: true }).ok).toBe(
        false,
      );
    }
  });

  it.each(["materials_requested", "materials_received"] as const)(
    "allows cancelling once the order is %s",
    (from) => {
      expect(transition(from, "cancelled", { hasMaterialLines: true }).ok).toBe(
        true,
      );
    },
  );
});

describe("confirm and cancel outcomes", () => {
  it("claims a seat only for a pending order", () => {
    expect(confirmOutcome("pending_confirmation")).toBe("claim");
  });

  it.each(["paid", "materials_requested", "materials_received"] as const)(
    "treats confirming a %s order as already confirmed",
    (status) => {
      expect(confirmOutcome(status)).toBe("already-confirmed");
    },
  );

  it("refuses confirming a cancelled order", () => {
    expect(confirmOutcome("cancelled")).toBe("illegal");
  });

  it("cancels a pending order without releasing a seat", () => {
    expect(cancelOutcome("pending_confirmation")).toBe("cancel");
  });

  it.each(["paid", "materials_requested", "materials_received"] as const)(
    "cancels a %s order and releases its seat",
    (status) => {
      expect(cancelOutcome(status)).toBe("cancel-release");
    },
  );

  it("makes a repeated cancel idempotent", () => {
    expect(cancelOutcome("cancelled")).toBe("already-cancelled");
  });

  it("releases a seat only when an order in a paid state is cancelled", () => {
    const paidStates: readonly OrderStatus[] = [
      "paid",
      "materials_requested",
      "materials_received",
    ];
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(releasesSeat(from, to)).toBe(
          paidStates.includes(from) && to === "cancelled",
        );
      }
    }
  });
});

describe("refund rules", () => {
  const paidOrder = {
    status: "paid" as OrderStatus,
    paidAmount: pesos(58_000),
    paidOn: "2026-10-20",
  };
  const refund = (amount: Money, on = "2026-10-25") => ({ amount, on });
  const today = "2026-10-31";

  it.each([0, 25_000, 58_000])("accepts a refund of %i pesos", (amount) => {
    expect(checkRefund(paidOrder, refund(pesos(amount)), today)).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it.each(["paid", "materials_requested", "materials_received"] as const)(
    "needs a refund to cancel an order in the %s state",
    (status) => {
      expect(checkRefund({ ...paidOrder, status }, undefined, today)).toEqual({
        ok: false,
        error: { kind: "invalid-refund", field: "amount", code: "required" },
      });
    },
  );

  it("refuses a negative refund", () => {
    const negative = Money.fromCentavos(-100);
    if (!negative.ok) throw new Error("fixture");
    expect(checkRefund(paidOrder, refund(negative.value), today)).toEqual({
      ok: false,
      error: { kind: "invalid-refund", field: "amount", code: "negative" },
    });
  });

  it("refuses a refund above what was paid", () => {
    expect(checkRefund(paidOrder, refund(pesos(58_001)), today)).toEqual({
      ok: false,
      error: { kind: "invalid-refund", field: "amount", code: "above-paid" },
    });
  });

  it("refuses a refund with cents", () => {
    const cents = Money.fromCentavos(1050);
    if (!cents.ok) throw new Error("fixture");
    expect(checkRefund(paidOrder, refund(cents.value), today)).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "amount",
        code: "not-whole-pesos",
      },
    });
  });

  it("accepts the payment day and today as the refund date", () => {
    expect(
      checkRefund(paidOrder, refund(pesos(1), "2026-10-20"), today).ok,
    ).toBe(true);
    expect(checkRefund(paidOrder, refund(pesos(1), today), today).ok).toBe(
      true,
    );
  });

  it("refuses a refund dated in the future", () => {
    expect(
      checkRefund(paidOrder, refund(pesos(1), "2026-11-01"), today),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "refundedOn",
        code: "future-date",
      },
    });
  });

  it("refuses a refund dated before the payment", () => {
    expect(
      checkRefund(paidOrder, refund(pesos(1), "2026-10-19"), today),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "refundedOn",
        code: "before-payment",
      },
    });
  });

  it("records no refund when a pending order is cancelled", () => {
    const pending = { status: "pending_confirmation" as OrderStatus };
    expect(checkRefund(pending, undefined, today)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(checkRefund(pending, refund(pesos(1)), today)).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "amount",
        code: "not-refundable",
      },
    });
  });
});

describe("order number", () => {
  it("pads the sequence to four digits", () => {
    expect(formatOrderNumber(2026, 7)).toBe("CI-2026-0007");
    expect(formatOrderNumber(2027, 1)).toBe("CI-2027-0001");
  });

  it("keeps numbers beyond 9999 intact", () => {
    expect(formatOrderNumber(2026, 12345)).toBe("CI-2026-12345");
  });

  it("uses the Córdoba year at the new-year boundary", () => {
    expect(cordobaYearOf(new Date("2027-01-01T02:59:59Z"))).toBe(2026);
    expect(cordobaYearOf(new Date("2027-01-01T03:00:00Z"))).toBe(2027);
  });
});

describe("public id", () => {
  it("encodes 16 random bytes as 22 base64url characters", () => {
    const id = generatePublicId(Uint8Array.from({ length: 16 }, (_, i) => i));
    expect(id).toHaveLength(22);
    expect(isPublicId(id)).toBe(true);
  });

  it("is url safe for extreme bytes and distinct for distinct bytes", () => {
    const high = generatePublicId(new Uint8Array(16).fill(255));
    const low = generatePublicId(new Uint8Array(16));
    expect(high).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(high).not.toBe(low);
  });

  it("rejects fewer than 16 bytes", () => {
    expect(() => generatePublicId(new Uint8Array(15))).toThrow();
  });

  it.each(["CI-2026-0007", "short", "has space 0123456789012", ""])(
    "does not accept %j as a public id",
    (value) => {
      expect(isPublicId(value)).toBe(false);
    },
  );
});

describe("order money", () => {
  it("adds fee and materials: 58.000 + 25.000 + 4.000 = 87.000", () => {
    const total = priceOrder(pesos(58000), pesos(29000));
    expect(total.ok && total.value.toCentavos()).toBe(8_700_000);
  });

  it("allows zero materials so the total equals the fee", () => {
    const total = priceOrder(pesos(58000), Money.zero());
    expect(total.ok && total.value.equals(pesos(58000))).toBe(true);
  });

  it("refuses a zero fee", () => {
    expect(priceOrder(Money.zero(), Money.zero())).toEqual({
      ok: false,
      error: "invalid-amount",
    });
  });

  it("accepts a zero fee only when the caller allows a free enrollment, and never a negative one", () => {
    const free = priceOrder(Money.zero(), pesos(0), { allowZeroFee: true });
    expect(free.ok && free.value.isZero()).toBe(true);
    expect(
      priceOrder(pesos(-1000), Money.zero(), { allowZeroFee: true }),
    ).toEqual({ ok: false, error: "invalid-amount" });
  });

  it("refuses fractions of a peso", () => {
    const fee = Money.fromCentavos(5_800_050);
    if (!fee.ok) throw new Error("fixture");
    expect(priceOrder(fee.value, Money.zero())).toEqual({
      ok: false,
      error: "invalid-amount",
    });
  });

  it("refuses negative materials", () => {
    expect(priceOrder(pesos(1000), pesos(-1))).toEqual({
      ok: false,
      error: "invalid-amount",
    });
  });

  it("refuses a total outside the safe-integer range instead of rounding", () => {
    const whole = Money.fromCentavos(
      Math.floor(Number.MAX_SAFE_INTEGER / 100) * 100,
    );
    if (!whole.ok) throw new Error("fixture");
    expect(priceOrder(whole.value, whole.value)).toEqual({
      ok: false,
      error: "invalid-total",
    });
  });

  it("accepts a payment equal to the total only", () => {
    const total = pesos(87000);
    const exact = checkPaymentAmount(total, pesos(87000));
    expect(exact.ok && exact.value.equals(total)).toBe(true);
    expect(checkPaymentAmount(total, pesos(80000))).toEqual({
      ok: false,
      error: { kind: "amount-mismatch" },
    });
  });

  it("refuses a payment that is not whole pesos", () => {
    const cents = Money.fromCentavos(8_700_050);
    if (!cents.ok) throw new Error("fixture");
    expect(checkPaymentAmount(pesos(87000), cents.value)).toEqual({
      ok: false,
      error: { kind: "amount-mismatch" },
    });
  });
});

describe("seat rules", () => {
  it("allows a claim while confirmed is below capacity", () => {
    expect(seatClaim(7, 8)).toEqual({ ok: true, value: 8 });
    expect(seatClaim(0, 1)).toEqual({ ok: true, value: 1 });
  });

  it("refuses a claim on a full turno", () => {
    expect(seatClaim(8, 8)).toEqual({
      ok: false,
      error: { kind: "turno-full" },
    });
  });

  it("refuses a claim when capacity was lowered below confirmed", () => {
    expect(seatClaim(6, 5)).toEqual({
      ok: false,
      error: { kind: "turno-full" },
    });
  });

  it("computes availability, never below zero", () => {
    expect(availableSeats(8, 5)).toBe(3);
    expect(availableSeats(5, 6)).toBe(0);
  });
});

describe("line source", () => {
  it("is stock when the units on hand cover the quantity", () => {
    expect(lineSourceFor(5, 5)).toBe("stock");
    expect(lineSourceFor(6, 2)).toBe("stock");
  });

  it("is supplier when the units on hand fall short or there is none", () => {
    expect(lineSourceFor(1, 2)).toBe("supplier");
    expect(lineSourceFor(0, 1)).toBe("supplier");
  });
});

describe("fulfillment of the lines", () => {
  it("has no material lines for an order without lines", () => {
    expect(fulfillmentOf([])).toEqual({
      hasMaterialLines: false,
      hasSupplierLines: false,
      stockOnly: false,
    });
  });

  it("is stock only when every line comes from stock", () => {
    expect(fulfillmentOf([{ source: "stock" }, { source: "stock" }])).toEqual({
      hasMaterialLines: true,
      hasSupplierLines: false,
      stockOnly: true,
    });
  });

  it("keeps the supplier path when any line is ordered", () => {
    expect(
      fulfillmentOf([{ source: "stock" }, { source: "supplier" }]),
    ).toMatchObject({ hasSupplierLines: true, stockOnly: false });
  });

  it("counts a line without a source as ordered from the supplier", () => {
    expect(fulfillmentOf([{}])).toMatchObject({
      hasSupplierLines: true,
      stockOnly: false,
    });
  });
});

describe("holdsSeat", () => {
  it("is true for a monthly record and for an order without a kind, false only for a material sale", () => {
    expect(holdsSeat("enrollment")).toBe(true);
    expect(holdsSeat(undefined)).toBe(true);
    expect(holdsSeat("material_sale")).toBe(false);
  });
});
