import type { CancelRefundInput, InvalidRefund } from "~/modules/enrollments";

export type CancelRefundField = "refundAmount" | "refundedOn" | "refundNote";

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The refund of a paid order's cancellation as typed. A form without the
 * refund fields (a pending order) records none; whether one was required is
 * the use case's decision.
 */
export function parseCancelRefund(
  form: FormData,
): CancelRefundInput | undefined {
  if (!form.has("refundAmount")) return undefined;
  const note = text(form, "refundNote").trim();
  return {
    amount: text(form, "refundAmount").trim(),
    refundedOn: text(form, "refundedOn").trim(),
    ...(note === "" ? {} : { note }),
  };
}

/** What was typed in the refund fields, so a refused form shows it again. */
export function cancelRefundValues(form: FormData): Record<string, string> {
  if (!form.has("refundAmount")) return {};
  return {
    refundAmount: text(form, "refundAmount"),
    refundedOn: text(form, "refundedOn"),
    refundNote: text(form, "refundNote"),
  };
}

const WHOLE_PESOS =
  "Ingresá un monto en pesos enteros, sin signos ni centavos.";

const MESSAGES: Record<
  InvalidRefund["field"],
  { field: CancelRefundField; byCode: Record<string, string>; fallback: string }
> = {
  amount: {
    field: "refundAmount",
    byCode: {
      required: "Ingresá cuánto devolviste (0 si no devolviste nada).",
      "invalid-format": WHOLE_PESOS,
      negative: WHOLE_PESOS,
      "out-of-range": WHOLE_PESOS,
      "not-whole-pesos":
        "Ingresá un monto en pesos enteros, sin puntos ni centavos.",
      "above-paid": "La devolución no puede ser mayor que lo cobrado.",
      "not-refundable": "Un pedido pendiente no tiene devolución.",
    },
    fallback: "Revisá el monto devuelto.",
  },
  refundedOn: {
    field: "refundedOn",
    byCode: {
      "invalid-calendar-date": "Ingresá una fecha válida.",
      "future-date": "La fecha de devolución no puede ser futura.",
      "before-payment": "La devolución no puede ser anterior al pago.",
    },
    fallback: "Revisá la fecha de devolución.",
  },
  note: {
    field: "refundNote",
    byCode: {
      "too-long": "La nota es demasiado larga (máximo 300 caracteres).",
    },
    fallback: "Revisá la nota.",
  },
};

/** The one Spanish message for the refund field a refusal names. */
export function refundFieldError(
  error: InvalidRefund,
): Partial<Record<CancelRefundField, string>> {
  const entry = MESSAGES[error.field];
  return { [entry.field]: entry.byCode[error.code] ?? entry.fallback };
}
