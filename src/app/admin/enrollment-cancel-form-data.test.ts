import { describe, expect, it } from "vitest";
import {
  cancelRefundValues,
  parseCancelRefund,
  refundFieldError,
} from "./enrollment-cancel-form-data";

function form(fields: Record<string, string>) {
  return new URLSearchParams(fields) as unknown as FormData;
}

describe("parseCancelRefund", () => {
  it("reads no refund when the form carries no refund fields", () => {
    expect(
      parseCancelRefund(form({ reason: "Pidió la baja" })),
    ).toBeUndefined();
  });

  it("reads the typed amount, date and note, trimmed", () => {
    expect(
      parseCancelRefund(
        form({
          refundAmount: " 25.000 ",
          refundedOn: " 2026-10-31 ",
          refundNote: "  Transferencia  ",
        }),
      ),
    ).toEqual({
      amount: "25.000",
      refundedOn: "2026-10-31",
      note: "Transferencia",
    });
  });

  it("leaves the note out when it is empty and keeps an empty amount for the service to name", () => {
    expect(
      parseCancelRefund(
        form({ refundAmount: "", refundedOn: "", refundNote: "  " }),
      ),
    ).toEqual({ amount: "", refundedOn: "" });
  });
});

describe("cancelRefundValues", () => {
  it("gives back what was typed so the form can show it again", () => {
    expect(
      cancelRefundValues(
        form({
          refundAmount: "1,5",
          refundedOn: "2026-11-01",
          refundNote: "x",
        }),
      ),
    ).toEqual({
      refundAmount: "1,5",
      refundedOn: "2026-11-01",
      refundNote: "x",
    });
    expect(cancelRefundValues(form({ reason: "r" }))).toEqual({});
  });
});

describe("refundFieldError", () => {
  it.each([
    ["amount", "required", "refundAmount", /0 si no devolviste/],
    ["amount", "invalid-format", "refundAmount", /pesos enteros/],
    ["amount", "negative", "refundAmount", /pesos enteros/],
    ["amount", "out-of-range", "refundAmount", /pesos enteros/],
    ["amount", "not-whole-pesos", "refundAmount", /sin puntos ni centavos/],
    ["amount", "above-paid", "refundAmount", /mayor que lo cobrado/],
    ["amount", "not-refundable", "refundAmount", /pendiente/],
    ["refundedOn", "invalid-calendar-date", "refundedOn", /fecha válida/],
    ["refundedOn", "future-date", "refundedOn", /futura/],
    ["refundedOn", "before-payment", "refundedOn", /anterior al pago/],
    ["note", "too-long", "refundNote", /300 caracteres/],
  ] as const)("names %s %s on %s", (field, code, formField, message) => {
    const errors = refundFieldError({ kind: "invalid-refund", field, code });

    expect(Object.keys(errors)).toEqual([formField]);
    expect(errors[formField]).toMatch(message);
  });
});
