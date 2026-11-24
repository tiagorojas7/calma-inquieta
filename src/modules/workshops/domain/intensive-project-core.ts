import {
  err,
  ok,
  parseWholePesos,
  type FieldIssue,
  type Invalid,
  Money,
  type Result,
} from "~/modules/_shared";

export const INTENSIVE_PROJECT_LIMITS = {
  name: 80,
  alt: 200,
  description: 600,
} as const;

const ZERO = Money.zero();

/** What the owner types for one project; the image is resolved by the service. */
export interface ProjectFieldsDraft {
  readonly name: string;
  readonly price: string;
  readonly deposit: string;
  /** Optional; blank means none. */
  readonly description: string;
}

export type IntensiveProjectField =
  "name" | "price" | "deposit" | "description" | "image";

/** The validated fields of a project: a name, whole-peso money and an optional description. */
export interface IntensiveProjectCore {
  readonly name: string;
  readonly price: Money;
  readonly deposit: Money;
  readonly description: string | null;
}

type MoneyField = "price" | "deposit";

function positivePesos(
  field: MoneyField,
  text: string,
  issues: FieldIssue<IntensiveProjectField>[],
): Money | null {
  const parsed = parseWholePesos(text.trim());
  if (!parsed.ok) {
    issues.push({ field, code: parsed.error });
    return null;
  }
  if (parsed.value.compare(ZERO) <= 0) {
    issues.push({ field, code: "out-of-range" });
    return null;
  }
  return parsed.value;
}

/**
 * A project needs a name of 1 to 80 characters, a total price and a deposit
 * in whole pesos with `0 < deposit <= price`. Every failing field is reported.
 */
export function validateIntensiveProject(
  draft: ProjectFieldsDraft,
): Result<IntensiveProjectCore, Invalid<IntensiveProjectField>> {
  const issues: FieldIssue<IntensiveProjectField>[] = [];
  const name = draft.name.trim();
  if (name === "") issues.push({ field: "name", code: "required" });
  else if (name.length > INTENSIVE_PROJECT_LIMITS.name)
    issues.push({ field: "name", code: "too-long" });

  const description = draft.description.trim();
  if (description.length > INTENSIVE_PROJECT_LIMITS.description)
    issues.push({ field: "description", code: "too-long" });

  const price = positivePesos("price", draft.price, issues);
  const deposit = positivePesos("deposit", draft.deposit, issues);
  if (price && deposit && deposit.compare(price) > 0)
    issues.push({ field: "deposit", code: "exceeds-price" });

  if (issues.length > 0 || !price || !deposit)
    return err({ kind: "invalid", issues });
  return ok({ name, price, deposit, description: description || null });
}
