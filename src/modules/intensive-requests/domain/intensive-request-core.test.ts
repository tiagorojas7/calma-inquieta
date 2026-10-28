import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  acceptsRequests,
  isIntensiveRequestStatus,
  validateCancelReason,
  validateDeposit,
  type IntensiveRequestGate,
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
