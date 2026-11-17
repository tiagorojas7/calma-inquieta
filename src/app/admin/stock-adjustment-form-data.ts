import type { FieldIssue } from "~/modules/_shared";
import type {
  InsufficientStock,
  StockAdjustmentField,
} from "~/modules/materials";
import { fieldErrors, type FieldMessages } from "./issue-messages";

/** The stock form's submitted text, and the variant it targets. */
export interface StockAdjustmentValues {
  readonly variantId: string;
  readonly delta: string;
  readonly reason: string;
}

export type StockAdjustmentErrors = Partial<
  Record<StockAdjustmentField, string>
>;

const FIELD_MESSAGES = {
  delta: {
    "invalid-format": "Ingresá un número entero, por ejemplo 5 o -1.",
    "out-of-range": "Ingresá una cantidad distinta de cero.",
  },
  reason: { "too-long": "Escribí un motivo más corto." },
} as const satisfies FieldMessages<StockAdjustmentField>;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export function parseStockAdjustmentDraft(
  form: FormData,
): StockAdjustmentValues {
  return {
    variantId: text(form, "variantId"),
    delta: text(form, "delta"),
    reason: text(form, "reason"),
  };
}

/** Field messages for a refused adjustment: validation issues or too few units. */
export function stockAdjustmentErrors(
  error:
    | {
        readonly kind: "invalid";
        readonly issues: readonly FieldIssue<StockAdjustmentField>[];
      }
    | InsufficientStock,
): StockAdjustmentErrors {
  if (error.kind === "invalid")
    return fieldErrors(error.issues, FIELD_MESSAGES);
  return {
    delta:
      error.onHand === 0
        ? "No hay unidades en stock para restar."
        : `No podés restar más de lo que hay: en stock hay ${String(error.onHand)}.`,
  };
}
