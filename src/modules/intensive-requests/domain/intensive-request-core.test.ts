import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  acceptsRequests,
  balanceDue,
  checkRefund,
  isIntensiveRequestStatus,
  parseRefund,
  totalPaid,
  validateBalance,
  validateCancelReason,
  validateDeposit,
  type IntensiveRequestGate,
  type Refund,
  type RequestPayments,
} from "./intensive-request-core";

const money = (pesos: number): Money => {
  const value = Money.fromCentavos(pesos * 100);
  if (!value.ok) throw new Error("bad money");
  return value.value;
};
const DUE = money(15000);
const TODAY = "2026-10-28";

function depositIssues(draft: {
  amount?: string;
  paidOn?: string;
  note?: string;
}) {
  const result = validateDeposit(
    { amount: "15000", paidOn: "2026-10-27", note: "", ...draft },
    DUE,
    TODAY,
  );
  return result.ok
    ? []
    : result.error.issues.map((issue) => `${issue.field}:${issue.code}`);
}

describe("isIntensiveRequestStatus", () => {
  it("accepts the three statuses and nothing else", () => {
    expect(
      ["pending_confirmation", "confirmed", "cancelled"].every(
        isIntensiveRequestStatus,
      ),
    ).toBe(true);
    expect(isIntensiveRequestStatus("paid")).toBe(false);
  });
});

describe("acceptsRequests", () => {
  const open: IntensiveRequestGate = { status: "published", upcoming: true };

  it("is true only for a published, upcoming intensivo", () => {
    expect(acceptsRequests(open)).toBe(true);
    expect(acceptsRequests({ ...open, status: "paused" })).toBe(false);
    expect(acceptsRequests({ ...open, status: "draft" })).toBe(false);
    expect(acceptsRequests({ ...open, upcoming: false })).toBe(false);
  });
});

describe("validateDeposit", () => {
  it("accepts the exact deposit with a past date and trims the note", () => {
    const result = validateDeposit(
      { amount: "$ 15.000", paidOn: "2026-10-28", note: "  transferencia " },
      DUE,
      TODAY,
    );
    expect(result).toEqual({
      ok: true,
      value: { paidOn: "2026-10-28", note: "transferencia" },
    });
  });

  it("stores a blank note as null", () => {
    const result = validateDeposit(
      { amount: "15000", paidOn: TODAY, note: "   " },
      DUE,
      TODAY,
    );
    expect(result.ok && result.value.note).toBeNull();
  });

  it("refuses an amount different from the deposit", () => {
    expect(depositIssues({ amount: "14000" })).toEqual(["amount:out-of-range"]);
    expect(depositIssues({ amount: "16000" })).toEqual(["amount:out-of-range"]);
  });

  it("refuses a missing or malformed amount", () => {
    expect(depositIssues({ amount: "" })).toEqual(["amount:required"]);
    expect(depositIssues({ amount: "15.000,50" })).toEqual([
      "amount:invalid-format",
    ]);
  });

  it("refuses a missing, impossible or future paid date", () => {
    expect(depositIssues({ paidOn: "" })).toEqual(["paidOn:required"]);
    expect(depositIssues({ paidOn: "2026-02-30" })).toEqual([
      "paidOn:invalid-format",
    ]);
    expect(depositIssues({ paidOn: "2026-10-29" })).toEqual([
      "paidOn:out-of-range",
    ]);
  });

  it("limits the note to 500 characters", () => {
    expect(depositIssues({ note: "x".repeat(501) })).toEqual(["note:too-long"]);
  });
});

describe("validateCancelReason", () => {
  it("trims a reason of 3 to 300 characters", () => {
    expect(validateCancelReason("  no puede asistir ")).toEqual({
      ok: true,
      value: "no puede asistir",
    });
  });

  it("refuses a blank, tiny or oversized reason", () => {
    expect(validateCancelReason("  ")).toMatchObject({
      ok: false,
      error: { issues: [{ field: "reason", code: "required" }] },
    });
    expect(validateCancelReason("ab")).toMatchObject({
      ok: false,
      error: { issues: [{ field: "reason", code: "invalid-format" }] },
    });
    expect(validateCancelReason("x".repeat(301))).toMatchObject({
      ok: false,
      error: { issues: [{ field: "reason", code: "too-long" }] },
    });
  });
});

describe("balanceDue", () => {
  it("is the snapshot price minus the snapshot deposit", () => {
    expect(balanceDue(money(40000), money(15000)).toCentavos()).toBe(2_500_000);
  });

  it("is zero when the deposit covered the whole price", () => {
    expect(balanceDue(money(40000), money(40000)).isZero()).toBe(true);
  });
});

describe("validateBalance", () => {
  const issues = (
    draft: { amount?: string; paidOn?: string; note?: string },
    depositPaidOn: string | null = "2026-10-20",
  ) => {
    const result = validateBalance(
      { amount: "25000", paidOn: "2026-10-27", note: "", ...draft },
      money(25000),
      TODAY,
      depositPaidOn,
    );
    return result.ok
      ? []
      : result.error.issues.map((issue) => `${issue.field}:${issue.code}`);
  };

  it("accepts exactly the balance due, trimming the note", () => {
    expect(
      validateBalance(
        { amount: "25.000", paidOn: "2026-10-27", note: " efectivo " },
        money(25000),
        TODAY,
        "2026-10-20",
      ),
    ).toEqual({ ok: true, value: { paidOn: "2026-10-27", note: "efectivo" } });
  });

  it("refuses any other amount, a future date and a malformed date", () => {
    expect(issues({ amount: "15000" })).toEqual(["amount:out-of-range"]);
    expect(issues({ paidOn: "2026-10-29" })).toEqual(["paidOn:out-of-range"]);
    expect(issues({ paidOn: "27/10/2026" })).toEqual(["paidOn:invalid-format"]);
  });

  it("refuses a date before the deposit was paid, and only then", () => {
    expect(issues({ paidOn: "2026-10-19" })).toEqual(["paidOn:out-of-range"]);
    expect(issues({ paidOn: "2026-10-20" })).toEqual([]);
    expect(issues({ paidOn: "2026-10-01" }, null)).toEqual([]);
  });

  it("reports the amount and the early date together", () => {
    expect(issues({ amount: "1", paidOn: "2026-10-19" })).toEqual([
      "amount:out-of-range",
      "paidOn:out-of-range",
    ]);
  });
});

describe("parseRefund", () => {
  const parse = (amount: string, refundedOn = "2026-10-27", note?: string) =>
    parseRefund({
      amount,
      refundedOn,
      ...(note === undefined ? {} : { note }),
    });

  it("reads whole pesos, $0 included, a real date and a trimmed note", () => {
    expect(parse("0")).toMatchObject({ ok: true, value: { note: null } });
    const parsed = parse("25.000", "2026-10-27", "  Transferencia ");
    expect(parsed.ok && parsed.value.amount.toCentavos()).toBe(2_500_000);
    expect(parsed.ok && parsed.value.note).toBe("Transferencia");
  });

  it("refuses a blank or malformed amount, a fake date and a long note", () => {
    expect(parse("")).toMatchObject({
      error: { field: "amount", code: "required" },
    });
    expect(parse("-5")).toMatchObject({
      error: { field: "amount", code: "invalid-format" },
    });
    expect(parse("12,5")).toMatchObject({
      error: { field: "amount", code: "not-whole-pesos" },
    });
    expect(parse("5", "2026-02-30")).toMatchObject({
      error: { field: "refundedOn", code: "invalid-calendar-date" },
    });
    expect(parse("5", "2026-10-27", "x".repeat(301))).toMatchObject({
      error: { field: "note", code: "too-long" },
    });
  });
});

describe("checkRefund", () => {
  const confirmed: RequestPayments = {
    status: "confirmed",
    deposit: money(15000),
    depositPaidOn: "2026-10-20",
    balance: null,
    balancePaidOn: null,
  };
  const withBalance: RequestPayments = {
    ...confirmed,
    balance: money(25000),
    balancePaidOn: "2026-10-25",
  };
  const refund = (pesos: number, refundedOn = "2026-10-27"): Refund => ({
    amount: money(pesos),
    refundedOn,
    note: null,
  });

  it("totals the deposit and the balance", () => {
    expect(totalPaid(confirmed).toCentavos()).toBe(1_500_000);
    expect(totalPaid(withBalance).toCentavos()).toBe(4_000_000);
    expect(totalPaid({ ...confirmed, deposit: null }).isZero()).toBe(true);
  });

  it("requires a refund from a confirmed request, $0 up to what it paid", () => {
    expect(checkRefund(confirmed, undefined, TODAY)).toMatchObject({
      error: { field: "amount", code: "required" },
    });
    expect(checkRefund(confirmed, refund(0), TODAY).ok).toBe(true);
    expect(checkRefund(confirmed, refund(15000), TODAY).ok).toBe(true);
    expect(checkRefund(confirmed, refund(15001), TODAY)).toMatchObject({
      error: { code: "above-paid" },
    });
  });

  it("counts the balance as paid when it was", () => {
    expect(checkRefund(withBalance, refund(40000), TODAY).ok).toBe(true);
    expect(checkRefund(withBalance, refund(40001), TODAY)).toMatchObject({
      error: { code: "above-paid" },
    });
  });

  it("refuses a negative or fractional amount", () => {
    const negative = { amount: money(-1), refundedOn: TODAY, note: null };
    expect(checkRefund(confirmed, negative, TODAY)).toMatchObject({
      error: { code: "negative" },
    });
    const centavos = Money.fromCentavos(150);
    if (!centavos.ok) throw new Error("bad money");
    expect(
      checkRefund(
        confirmed,
        { amount: centavos.value, refundedOn: TODAY, note: null },
        TODAY,
      ),
    ).toMatchObject({ error: { code: "not-whole-pesos" } });
  });

  it("dates the refund from the last payment to today", () => {
    expect(
      checkRefund(confirmed, refund(0, "2026-10-29"), TODAY),
    ).toMatchObject({
      error: { field: "refundedOn", code: "future-date" },
    });
    expect(
      checkRefund(confirmed, refund(0, "2026-10-19"), TODAY),
    ).toMatchObject({
      error: { field: "refundedOn", code: "before-payment" },
    });
    expect(
      checkRefund(withBalance, refund(0, "2026-10-24"), TODAY),
    ).toMatchObject({
      error: { code: "before-payment" },
    });
    expect(checkRefund(withBalance, refund(0, "2026-10-25"), TODAY).ok).toBe(
      true,
    );
  });

  it("allows no refund from a pending request", () => {
    const pending = { ...confirmed, status: "pending_confirmation" as const };
    expect(checkRefund(pending, undefined, TODAY).ok).toBe(true);
    expect(checkRefund(pending, refund(0), TODAY)).toMatchObject({
      error: { code: "not-refundable" },
    });
  });
});
