import { err, type Result } from "./result";
import { Money } from "./money";

export type Denied = { readonly kind: "denied" };
export type Unavailable = { readonly kind: "unavailable" };
export type NotFound = { readonly kind: "not-found" };
export type IssueCode =
  | "required"
  | "too-long"
  | "invalid-format"
  | "out-of-range"
  | "too-many-decimals"
  | "not-whole-pesos"
  | "duplicate"
  | "not-selectable"
  | "unknown-reference"
  | "too-many"
  | "confirmation-required"
  | "in-past"
  | "end-before-start"
  | "exceeds-price"
  | "exceeds-capacity"
  | "percentage-not-applicable";
export type FieldIssue<F extends string> = {
  readonly field: F;
  readonly code: IssueCode;
};
export type Invalid<F extends string = string> = {
  readonly kind: "invalid";
  readonly issues: readonly FieldIssue<F>[];
};
export type TransitionRefused<S extends string> = {
  readonly kind: "transition-refused";
  readonly from: S;
  readonly to: S;
};
export type RulesUnmet<R extends string> = {
  readonly kind: "rules-unmet";
  readonly rules: readonly R[];
};
export interface Audit {
  readonly updatedBy: string;
  readonly updatedAt: Date;
}
export type AdminFailure = Denied | Unavailable;
export const denied: Denied = { kind: "denied" };
export const unavailable: Unavailable = { kind: "unavailable" };

export function parseWholePesos(
  text: string,
): Result<
  Money,
  "required" | "invalid-format" | "not-whole-pesos" | "out-of-range"
> {
  if (text.trim() === "") return err("required");
  if (!/^\d+$/.test(text.trim())) return err("invalid-format");
  const pesos = Number(text);
  if (!Number.isSafeInteger(pesos)) return err("out-of-range");
  const money = Money.fromCentavos(pesos * 100);
  return money.ok ? money : err("out-of-range");
}
