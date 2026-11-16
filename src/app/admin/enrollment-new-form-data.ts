import { parseWholePesos, type Money } from "~/modules/_shared";

export type EnrollmentNewField =
  "offer" | "fullName" | "email" | "phone" | "fee";

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
  "Ingresá la cuota en pesos enteros, sin puntos ni centavos. Por ejemplo: 58000.";
const REQUIRED = "Completá este campo.";
const SEPARATOR = "|";

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
  return { values, target, fee: parsedFee.ok ? parsedFee.value : null, errors };
}
