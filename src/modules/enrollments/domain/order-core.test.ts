import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  ORDER_STATUSES,
  availableSeats,
  cancelOutcome,
  checkPaymentAmount,
  confirmOutcome,
  cordobaYearOf,
  formatOrderNumber,
  generatePublicId,
  isPublicId,
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

  it("keeps cancelled and materials_received terminal", () => {
    for (const from of ["cancelled", "materials_received"] as const) {
      for (const to of ORDER_STATUSES) {
        expect(transition(from, to, { hasMaterialLines: true }).ok).toBe(false);
      }
    }
  });

  it("refuses cancelling once materials were requested", () => {
    expect(
      transition("materials_requested", "cancelled", { hasMaterialLines: true })
        .ok,
    ).toBe(false);
  });
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

  it("cancels a paid order and releases its seat", () => {
    expect(cancelOutcome("paid")).toBe("cancel-release");
  });

  it("makes a repeated cancel idempotent", () => {
    expect(cancelOutcome("cancelled")).toBe("already-cancelled");
  });

  it.each(["materials_requested", "materials_received"] as const)(
    "refuses cancelling a %s order",
    (status) => {
      expect(cancelOutcome(status)).toBe("illegal");
    },
  );

  it("releases a seat only when a paid order is cancelled", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(releasesSeat(from, to)).toBe(
          from === "paid" && to === "cancelled",
        );
      }
    }
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
