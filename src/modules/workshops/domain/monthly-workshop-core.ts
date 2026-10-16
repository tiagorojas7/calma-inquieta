import {
  err,
  ok,
  parseWholePesos,
  type FieldIssue,
  type Invalid,
  Money,
  type Result,
  type TransitionRefused,
} from "~/modules/_shared";

export type MonthlyLifecycle = "draft" | "published" | "paused" | "archived";
export type AssignmentModality = "own" | "third_party";
export type MonthlyCoreField =
  "name" | "slug" | "summary" | "description" | "technique" | "defaultFee";
export const MONTHLY_LIMITS = {
  name: 120,
  slug: 80,
  summary: 200,
  description: 5000,
  technique: 120,
} as const;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ZERO = Money.zero();

export interface MonthlyCoreDraft {
  readonly name: string;
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly technique: string;
  readonly defaultFee: string;
}
export interface MonthlyCore {
  readonly name: string;
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly technique: string;
  readonly defaultFee: Money;
}

export function validateMonthlyCore(
  draft: MonthlyCoreDraft,
): Result<MonthlyCore, Invalid<MonthlyCoreField>> {
  const name = draft.name.trim(),
    slug = draft.slug.trim(),
    summary = draft.summary.trim(),
    description = draft.description.trim(),
    technique = draft.technique.trim();
  const issues: FieldIssue<MonthlyCoreField>[] = [];
  for (const [field, value, limit] of [
    ["name", name, MONTHLY_LIMITS.name],
    ["summary", summary, MONTHLY_LIMITS.summary],
    ["description", description, MONTHLY_LIMITS.description],
    ["technique", technique, MONTHLY_LIMITS.technique],
  ] as const) {
    if (!value) issues.push({ field, code: "required" });
    else if (value.length > limit) issues.push({ field, code: "too-long" });
  }
  if (!slug) issues.push({ field: "slug", code: "required" });
  else if (slug.length > MONTHLY_LIMITS.slug)
    issues.push({ field: "slug", code: "too-long" });
  else if (!SLUG.test(slug))
    issues.push({ field: "slug", code: "invalid-format" });
  const fee = parseWholePesos(draft.defaultFee.trim());
  if (!fee.ok) issues.push({ field: "defaultFee", code: fee.error });
  else if (fee.value.compare(ZERO) <= 0)
    issues.push({ field: "defaultFee", code: "out-of-range" });
  return issues.length || !fee.ok
    ? err({ kind: "invalid", issues })
    : ok({
        name,
        slug,
        summary,
        description,
        technique,
        defaultFee: fee.value,
      });
}

export type PercentageSubmission =
  | { readonly kind: "blank" }
  | {
      readonly kind: "invalid";
      readonly code: "invalid-format" | "out-of-range" | "too-many-decimals";
    }
  | { readonly kind: "value"; readonly basisPoints: number };
export function assignmentPercentage(
  modality: AssignmentModality,
  submission: PercentageSubmission,
): Result<number | null, FieldIssue<"percentage">> {
  if (modality === "own")
    return submission.kind === "blank"
      ? ok(null)
      : err({ field: "percentage", code: "percentage-not-applicable" });
  if (submission.kind === "blank")
    return err({ field: "percentage", code: "required" });
  return submission.kind === "invalid"
    ? err({ field: "percentage", code: submission.code })
    : ok(submission.basisPoints);
}
const transitions: Readonly<
  Record<MonthlyLifecycle, readonly MonthlyLifecycle[]>
> = {
  draft: ["published", "archived"],
  published: ["paused", "archived"],
  paused: ["published", "archived"],
  archived: ["draft"],
};
export function checkMonthlyTransition(
  from: MonthlyLifecycle,
  to: MonthlyLifecycle,
): Result<MonthlyLifecycle, TransitionRefused<MonthlyLifecycle>> {
  return transitions[from].includes(to)
    ? ok(to)
    : err({ kind: "transition-refused", from, to });
}
export type MonthlyPublishRule =
  "name" | "slug" | "teacher" | "percentage" | "default-fee" | "active-turno";
export function unmetMonthlyPublishRules(facts: {
  readonly name: string;
  readonly slug: string;
  readonly defaultFee: Money;
  readonly assignment: {
    readonly active: boolean;
    readonly modality: AssignmentModality;
    readonly percentageBp: number | null;
  } | null;
  readonly activeTurnos: number;
}): readonly MonthlyPublishRule[] {
  const rules: MonthlyPublishRule[] = [];
  if (!facts.name.trim() || facts.name.trim().length > MONTHLY_LIMITS.name)
    rules.push("name");
  if (!SLUG.test(facts.slug) || facts.slug.length > MONTHLY_LIMITS.slug)
    rules.push("slug");
  if (!facts.assignment?.active) rules.push("teacher");
  else if (
    facts.assignment.modality === "third_party" &&
    facts.assignment.percentageBp === null
  )
    rules.push("percentage");
  if (facts.defaultFee.compare(ZERO) <= 0) rules.push("default-fee");
  if (facts.activeTurnos < 1) rules.push("active-turno");
  return rules;
}
