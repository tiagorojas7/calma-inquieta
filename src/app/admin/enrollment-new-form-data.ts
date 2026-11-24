import { parseWholePesos, type Money } from "~/modules/_shared";
import {
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  MIN_LINE_QUANTITY,
  type CartLine,
} from "~/modules/enrollments";

export type EnrollmentNewField =
  "offer" | "fullName" | "email" | "phone" | "fee" | "materials";

/** One chosen catalog variant as submitted: the quantity stays as typed. */
export interface EnrollmentNewLineValue {
  readonly materialId: string;
  readonly variantId: string;
  readonly quantity: string;
}

export interface EnrollmentNewValues {
  readonly offer: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  /** Whole pesos as typed; the form starts with the period fee. */
  readonly fee: string;
}

export interface EnrollmentTarget {
  readonly slug: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoId: string;
}

export const OFFER_REQUIRED = "Elegí el taller, el mes y el turno.";
export const FEE_INVALID =
  "Ingresá la cuota en pesos enteros, sin centavos; los puntos de miles se aceptan. Por ejemplo: 58000 o 58.000.";
export const MATERIAL_UNAVAILABLE =
  "Algún material ya no está disponible o no tiene precio. Quitalo y probá de nuevo.";
const QUANTITY_INVALID = `Cada material lleva entre ${String(MIN_LINE_QUANTITY)} y ${String(MAX_LINE_QUANTITY)} unidades enteras.`;
const TOO_MANY_LINES = `Elegí hasta ${String(MAX_CART_LINES)} materiales distintos.`;
const TOTAL_TOO_BIG =
  "El total es demasiado grande. Revisá la cuota y los materiales.";
const REQUIRED = "Completá este campo.";
const SEPARATOR = "|";
const LINE_PREFIX = "line:";

/** The materials field error for a refusal of the chosen lines; null when it is not one. */
export function materialsRefusal(failure: {
  readonly kind: string;
}): string | null {
  switch (failure.kind) {
    case "invalid-quantity":
      return QUANTITY_INVALID;
    case "too-many-lines":
      return TOO_MANY_LINES;
    case "material-not-offered":
    case "material-unavailable":
    case "invalid-price":
      return MATERIAL_UNAVAILABLE;
    case "invalid-total":
      return TOTAL_TOO_BIG;
    default:
      return null;
  }
}

/** Whole digits only: "1.5", "1e1", "-1" and "" never become a number. */
function quantityOf(typed: string): number {
  return /^[0-9]+$/.test(typed) ? Number(typed) : Number.NaN;
}

/** The chosen catalog variants of a form, as typed and as the server reads them. */
export function parseMaterialLines(form: FormData): {
  lines: EnrollmentNewLineValue[];
  cartLines: CartLine[];
  malformed: boolean;
} {
  const lines: EnrollmentNewLineValue[] = [];
  const cartLines: CartLine[] = [];
  let malformed = false;
  for (const [name, value] of form.entries()) {
    if (!name.startsWith(LINE_PREFIX)) continue;
    const [materialId, variantId, ...rest] = name
      .slice(LINE_PREFIX.length)
      .split(":");
    if (!materialId || !variantId || rest.length > 0) {
      malformed = true;
      continue;
    }
    const quantity = typeof value === "string" ? value.trim() : "";
    lines.push({ materialId, variantId, quantity });
    cartLines.push({ materialId, variantId, quantity: quantityOf(quantity) });
  }
  return { lines, cartLines, malformed };
}

/** One select value carrying workshop, month and turno, so no script is needed. */
export function encodeOffer(target: EnrollmentTarget): string {
  return [target.slug, target.period, target.turnoId].join(SEPARATOR);
}

function decodeOffer(value: string): EnrollmentTarget | null {
  const [slug, period, turnoId, ...rest] = value.split(SEPARATOR);
  if (!slug || !period || !turnoId || rest.length > 0) return null;
  return { slug, period, turnoId };
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseEnrollmentNewForm(form: FormData): {
  values: EnrollmentNewValues;
  target: EnrollmentTarget | null;
  /** The fee in whole pesos ($0 allowed); null when the field has an error. */
  fee: Money | null;
  /** The chosen catalog variants as typed, to show again after a refusal. */
  lines: readonly EnrollmentNewLineValue[];
  /** The same lines as the server reads them; an unreadable quantity is NaN. */
  cartLines: readonly CartLine[];
  errors: Partial<Record<EnrollmentNewField, string>>;
} {
  const values: EnrollmentNewValues = {
    offer: text(form, "offer"),
    fullName: text(form, "fullName"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    fee: text(form, "fee"),
  };
  const target = decodeOffer(values.offer);
  const errors: Partial<Record<EnrollmentNewField, string>> = {};
  if (target === null) errors.offer = OFFER_REQUIRED;
  if (values.fullName === "") errors.fullName = REQUIRED;
  if (values.email === "") errors.email = REQUIRED;
  if (values.phone === "") errors.phone = REQUIRED;
  const parsedFee = parseWholePesos(values.fee);
  if (!parsedFee.ok)
    errors.fee = parsedFee.error === "required" ? REQUIRED : FEE_INVALID;
  const chosen = parseMaterialLines(form);
  if (chosen.malformed) errors.materials = MATERIAL_UNAVAILABLE;
  return {
    values,
    target,
    fee: parsedFee.ok ? parsedFee.value : null,
    lines: chosen.lines,
    cartLines: chosen.cartLines,
    errors,
  };
}
