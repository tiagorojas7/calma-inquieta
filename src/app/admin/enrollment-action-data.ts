import { data } from "react-router";

export type EnrollmentIntent =
  | {
      kind: "confirm";
      amount: string;
      paidOn: string;
      note: string;
    }
  | { kind: "cancel"; reason: string }
  | { kind: "materials-requested" }
  | { kind: "materials-received" };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** The mutation a detail form asked for, or null for an unknown intent. */
export function parseEnrollmentIntent(form: FormData): EnrollmentIntent | null {
  switch (text(form, "intent")) {
    case "confirm":
      return {
        kind: "confirm",
        amount: text(form, "amount").trim(),
        paidOn: text(form, "paidOn").trim(),
        note: text(form, "note").trim(),
      };
    case "cancel":
      return { kind: "cancel", reason: text(form, "reason") };
    case "materials-requested":
      return { kind: "materials-requested" };
    case "materials-received":
      return { kind: "materials-received" };
    default:
      return null;
  }
}

type Field = "amount" | "paidOn" | "reason";

const FIELD_MESSAGES: Record<Field, Record<string, string>> = {
  amount: {
    "not-whole-pesos":
      "Ingresá un monto en pesos enteros, sin puntos ni centavos.",
  },
  paidOn: {
    "invalid-calendar-date": "Ingresá una fecha válida.",
    "future-date": "La fecha de pago no puede ser futura.",
  },
  reason: {
    required: "Contanos el motivo (al menos 3 caracteres).",
    "too-long": "El motivo es demasiado largo (máximo 300 caracteres).",
  },
};

const FIELD_FALLBACK: Record<Field, string> = {
  amount: "Ingresá el monto cobrado en pesos enteros.",
  paidOn: "Ingresá una fecha válida.",
  reason: "Revisá el motivo.",
};

/** One Spanish message per invalid field; the first issue for a field wins. */
export function enrollmentFieldErrors(
  issues: readonly { readonly field: Field; readonly code: string }[],
): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const issue of issues) {
    errors[issue.field] ??=
      FIELD_MESSAGES[issue.field][issue.code] ?? FIELD_FALLBACK[issue.field];
  }
  return errors;
}

/** The refusals a screen words itself; null means the failure is not one. */
export function enrollmentRefusalMessage(failure: {
  readonly kind: string;
}): string | null {
  switch (failure.kind) {
    case "turno-full":
      return "El turno está completo. El pedido sigue pendiente.";
    case "period-closed":
      return "El mes ya está cerrado. No se puede confirmar este pedido.";
    case "amount-mismatch":
      return "El monto no coincide con el total del pedido.";
    case "illegal-transition":
      return "Esa acción no está disponible para el estado actual del pedido.";
    case "already-confirmed":
      return "El pedido ya estaba cobrado.";
    case "already-cancelled":
      return "El pedido ya estaba cancelado.";
    default:
      return null;
  }
}

export function refusalResponse(
  message: string,
  values: Record<string, string>,
) {
  return data({ formError: message, values }, { status: 409 });
}
