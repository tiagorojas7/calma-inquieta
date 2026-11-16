import { describe, expect, it } from "vitest";
import {
  correctionFieldErrors,
  parseCorrectionForm,
} from "./enrollment-correction-form-data";
import { encodeOffer } from "./enrollment-new-form-data";

const ORDER = "00000000-0000-4000-8000-000000000001";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) data.set(name, value);
  return data;
}

describe("parseCorrectionForm", () => {
  it("keeps the current place when no offer is chosen", () => {
    const parsed = parseCorrectionForm(
      form({ intent: "correct", correctOffer: "", correctFee: " 50.000 " }),
      ORDER,
    );

    expect(parsed.errors).toEqual({});
    expect(parsed.input).toEqual({ orderId: ORDER, fee: "50.000" });
  });

  it("reads the chosen workshop, month and turno from the select value", () => {
    const offer = encodeOffer({
      slug: "ceramica",
      period: "2026-11",
      turnoId: "t-2",
    });

    const parsed = parseCorrectionForm(
      form({ correctOffer: offer, correctFee: "0" }),
      ORDER,
    );

    expect(parsed.input).toEqual({
      orderId: ORDER,
      target: { slug: "ceramica", period: "2026-11", turnoId: "t-2" },
      fee: "0",
    });
  });

  it.each(["ceramica", "a|b", "a|b|c|d"])(
    "refuses a malformed offer %s without building a request",
    (offer) => {
      const parsed = parseCorrectionForm(
        form({ correctOffer: offer, correctFee: "100" }),
        ORDER,
      );

      expect(parsed.input).toBeNull();
      expect(parsed.errors).toEqual({
        correctOffer: "Elegí una opción válida.",
      });
    },
  );

  it("carries the note and a refund only when an amount was typed", () => {
    const without = parseCorrectionForm(
      form({
        correctFee: "100",
        correctNote: "  wrong fee  ",
        correctRefundedOn: "2026-10-31",
        correctRefundNote: "ignored",
      }),
      ORDER,
    );
    expect(without.input).toEqual({
      orderId: ORDER,
      fee: "100",
      note: "wrong fee",
    });

    const withRefund = parseCorrectionForm(
      form({
        correctFee: "100",
        correctRefundAmount: " 8000 ",
        correctRefundedOn: "2026-10-31",
        correctRefundNote: "  cash  ",
      }),
      ORDER,
    );
    expect(withRefund.input).toEqual({
      orderId: ORDER,
      fee: "100",
      refund: { amount: "8000", refundedOn: "2026-10-31", note: "cash" },
    });
  });

  it("sends a missing fee as an empty string for the use case to refuse", () => {
    expect(parseCorrectionForm(form({}), ORDER).input).toEqual({
      orderId: ORDER,
      fee: "",
    });
  });

  it("echoes every field exactly as typed so a refused form shows it again", () => {
    const typed = {
      correctOffer: "",
      correctFee: " 5 ",
      correctNote: " n ",
      correctRefundAmount: " 1 ",
      correctRefundedOn: "2026-10-31",
      correctRefundNote: " r ",
    };

    expect(parseCorrectionForm(form(typed), ORDER).values).toEqual(typed);
    expect(parseCorrectionForm(form({}), ORDER).values).toEqual({
      correctOffer: "",
      correctFee: "",
      correctNote: "",
      correctRefundAmount: "",
      correctRefundedOn: "",
      correctRefundNote: "",
    });
  });
});

describe("correctionFieldErrors", () => {
  it.each([
    [{ kind: "invalid-fee" }, "correctFee", /pesos enteros/],
    [{ kind: "invalid-total" }, "correctFee", /total es demasiado grande/],
    [
      { kind: "invalid", issues: [{ field: "reason", code: "too-long" }] },
      "correctNote",
      /máximo 300/,
    ],
    [
      { kind: "invalid-refund", field: "amount", code: "required" },
      "correctRefundAmount",
      /cuánto devolviste/,
    ],
    [
      { kind: "invalid-refund", field: "amount", code: "above-difference" },
      "correctRefundAmount",
      /diferencia/,
    ],
    [
      { kind: "invalid-refund", field: "amount", code: "not-whole-pesos" },
      "correctRefundAmount",
      /pesos enteros/,
    ],
    [
      { kind: "invalid-refund", field: "amount", code: "not-refundable" },
      "correctRefundAmount",
      /sólo|solo/i,
    ],
    [
      { kind: "invalid-refund", field: "refundedOn", code: "future-date" },
      "correctRefundedOn",
      /futura/,
    ],
    [
      { kind: "invalid-refund", field: "refundedOn", code: "before-payment" },
      "correctRefundedOn",
      /anterior al pago/,
    ],
    [
      {
        kind: "invalid-refund",
        field: "refundedOn",
        code: "invalid-calendar-date",
      },
      "correctRefundedOn",
      /fecha válida/,
    ],
    [
      { kind: "invalid-refund", field: "note", code: "too-long" },
      "correctRefundNote",
      /máximo 300/,
    ],
  ])("words %j on the field it names", (failure, field, message) => {
    const errors = correctionFieldErrors(failure);

    expect(Object.keys(errors ?? {})).toEqual([field]);
    expect(errors?.[field as keyof typeof errors]).toMatch(message);
  });

  it("falls back to a generic message for an unlisted refund code", () => {
    expect(
      correctionFieldErrors({
        kind: "invalid-refund",
        field: "amount",
        code: "negative",
      }),
    ).toEqual({
      correctRefundAmount:
        "Ingresá un monto en pesos enteros, sin signos ni centavos.",
    });
  });

  it("leaves every other failure to the screen", () => {
    for (const kind of ["turno-full", "duplicate-order", "unavailable"])
      expect(correctionFieldErrors({ kind })).toBeNull();
  });
});
