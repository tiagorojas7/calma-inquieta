import type { CorrectEnrollmentInput } from "~/modules/enrollments";
import type { CorrectionFormField } from "~/app/ui/admin/enrollment-correction";
import { FEE_INVALID } from "./enrollment-new-form-data";

type Errors = Partial<Record<CorrectionFormField, string>>;

const FIELDS: readonly CorrectionFormField[] = [
  "correctOffer",
  "correctFee",
  "correctNote",
  "correctRefundAmount",
  "correctRefundedOn",
  "correctRefundNote",
];

const OFFER_INVALID = "Elegí una opción válida.";
const TOTAL_TOO_BIG =
  "El total es demasiado grande. Revisá la cuota y los materiales.";
const NOTE_TOO_LONG = "El motivo es demasiado largo (máximo 300 caracteres).";
const WHOLE_PESOS =
  "Ingresá un monto en pesos enteros, sin signos ni centavos.";
const SEPARATOR = "|";

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** `slug|YYYY-MM|turnoId`, the value `encodeOffer` puts in the select. */
function decodeOffer(
  value: string,
): NonNullable<CorrectEnrollmentInput["target"]> | null {
  const [slug, period, turnoId, ...rest] = value.split(SEPARATOR);
  if (!slug || !period || !turnoId || rest.length > 0) return null;
  return { slug, period, turnoId };
}

/**
 * What the correction form posted. An empty offer keeps the current workshop,
 * month and turno; the refund is sent only when an amount was typed, and
 * whether one is required is the use case's decision. `input` is null when the
 * offer cannot be read, with the message on its field.
 */
export function parseCorrectionForm(
  form: FormData,
  orderId: string,
): {
  input: CorrectEnrollmentInput | null;
  /** Every field exactly as typed, to show the form again after a refusal. */
  values: Record<CorrectionFormField, string>;
  errors: Errors;
} {
  const values = Object.fromEntries(
    FIELDS.map((field) => [field, text(form, field)]),
  ) as Record<CorrectionFormField, string>;
  const offer = values.correctOffer.trim();
  const target = offer === "" ? undefined : decodeOffer(offer);
  if (target === null)
    return { input: null, values, errors: { correctOffer: OFFER_INVALID } };
  const note = values.correctNote.trim();
  const refundAmount = values.correctRefundAmount.trim();
  const refundNote = values.correctRefundNote.trim();
  return {
    input: {
      orderId,
      ...(target === undefined ? {} : { target }),
      fee: values.correctFee.trim(),
      ...(refundAmount === ""
        ? {}
        : {
            refund: {
              amount: refundAmount,
              refundedOn: values.correctRefundedOn.trim(),
              ...(refundNote === "" ? {} : { note: refundNote }),
            },
          }),
      ...(note === "" ? {} : { note }),
    },
    values,
    errors: {},
  };
}

const REFUND_MESSAGES: Record<
  "amount" | "refundedOn" | "note",
  {
    field: CorrectionFormField;
    byCode: Record<string, string>;
    fallback: string;
  }
> = {
  amount: {
    field: "correctRefundAmount",
    byCode: {
      required: "Ingresá cuánto devolviste (0 si no devolviste nada).",
      "not-whole-pesos":
        "Ingresá un monto en pesos enteros, sin puntos ni centavos.",
      "above-difference":
        "La devolución no puede ser mayor que la diferencia entre lo cobrado y el nuevo total.",
      "not-refundable": "La devolución solo se carga cuando el total baja.",
    },
    fallback: WHOLE_PESOS,
  },
  refundedOn: {
    field: "correctRefundedOn",
    byCode: {
      "invalid-calendar-date": "Ingresá una fecha válida.",
      "future-date": "La fecha de devolución no puede ser futura.",
      "before-payment": "La devolución no puede ser anterior al pago.",
    },
    fallback: "Revisá la fecha de devolución.",
  },
  note: {
    field: "correctRefundNote",
    byCode: {
      "too-long": "La nota es demasiado larga (máximo 300 caracteres).",
    },
    fallback: "Revisá la nota.",
  },
};

/**
 * The message for the field a refused correction names; null when the failure
 * is not about a field and the screen words it itself.
 */
export function correctionFieldErrors(failure: {
  readonly kind: string;
  readonly field?: string;
  readonly code?: string;
  readonly issues?: unknown;
}): Errors | null {
  switch (failure.kind) {
    case "invalid-fee":
      return { correctFee: FEE_INVALID };
    case "invalid-total":
      return { correctFee: TOTAL_TOO_BIG };
    case "invalid":
      return { correctNote: NOTE_TOO_LONG };
    case "invalid-refund": {
      const entry =
        failure.field === "refundedOn" || failure.field === "note"
          ? REFUND_MESSAGES[failure.field]
          : REFUND_MESSAGES.amount;
      return {
        [entry.field]: entry.byCode[failure.code ?? ""] ?? entry.fallback,
      };
    }
    default:
      return null;
  }
}
