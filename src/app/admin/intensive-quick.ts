import type { FieldIssue } from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import {
  slugify,
  type IntensivePublishRule,
  type IntensiveWorkshopDraft,
  type IntensiveWorkshopField,
  type IntensivesService,
} from "~/modules/workshops";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { parseIntensiveDraft } from "./intensive-form-data";
import { deriveSummary } from "./workshop-quick-form";

/** Policy a new intensivo gets when the owner does not write one. */
export const DEFAULT_INTENSIVE_POLICY =
  adminMicrocopy.intensives.quick.defaultPolicy;
const DEFAULT_MIN_SEATS = "1";

export type QuickIntensiveIntent = "publish" | "draft";

export interface QuickIntensiveInput {
  readonly intent: QuickIntensiveIntent;
  /** What the domain receives: slug empty, summary and defaults filled in. */
  readonly draft: IntensiveWorkshopDraft;
  /** What the owner typed, to show again when the form is rejected. */
  readonly values: IntensiveWorkshopDraft;
}

/**
 * The one-page "Nuevo intensivo" form as a draft. The slug is left empty so
 * the flow derives a unique one; the summary comes from the description and
 * the seats and policy fall back to defaults, so none of them is asked.
 */
export function parseQuickIntensive(form: FormData): QuickIntensiveInput {
  const values = parseIntensiveDraft(form);
  const summary = values.summary.trim();
  const minSeats = values.minSeats.trim();
  const policyText = values.policyText.trim();
  return {
    intent: form.get("intent") === "publish" ? "publish" : "draft",
    values,
    draft: {
      ...values,
      slug: "",
      summary: summary || deriveSummary(values.description),
      minSeats: minSeats || DEFAULT_MIN_SEATS,
      policyText: policyText || DEFAULT_INTENSIVE_POLICY,
    },
  };
}

type Failure = { readonly kind: "denied" | "unavailable" | "not-found" };

export type QuickIntensiveOutcome =
  | {
      readonly kind: "invalid";
      readonly issues: readonly FieldIssue<IntensiveWorkshopField>[];
    }
  | { readonly kind: "saved"; readonly id: string }
  | { readonly kind: "published"; readonly id: string }
  /** Saved as a draft, but publishing it was refused. */
  | {
      readonly kind: "partial";
      readonly id: string;
      readonly rules: readonly IntensivePublishRule[];
    }
  | { readonly kind: "failed"; readonly failure: Failure };

const MAX_SLUG_ATTEMPTS = 50;

function isDuplicateSlug(issue: FieldIssue<IntensiveWorkshopField>): boolean {
  return issue.field === "slug" && issue.code === "duplicate";
}

/** The slug is never typed here, so a slug problem belongs to the name. */
function reportedOnName(
  issues: readonly FieldIssue<IntensiveWorkshopField>[],
): FieldIssue<IntensiveWorkshopField>[] {
  const seen = new Set<string>();
  return issues
    .map((issue) =>
      issue.field === "slug" ? { ...issue, field: "name" as const } : issue,
    )
    .filter((issue) => {
      if (seen.has(issue.field)) return false;
      seen.add(issue.field);
      return true;
    });
}

/** Creates the intensivo with a slug suffixed -2, -3... while another holds it. */
async function createWithUniqueSlug(
  intensives: IntensivesService,
  actor: AdminActor,
  draft: IntensiveWorkshopDraft,
) {
  const base = slugify(draft.name);
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = base && attempt > 1 ? `${base}-${String(attempt)}` : base;
    const created = await intensives.create(actor, { ...draft, slug });
    if (
      created.ok ||
      created.error.kind !== "invalid" ||
      !created.error.issues.some(isDuplicateSlug) ||
      !base
    )
      return created;
  }
  return intensives.create(actor, {
    ...draft,
    slug: `${base}-${String(Date.now())}`,
  });
}

/**
 * The one-page "Nuevo intensivo" flow over the existing service, so every
 * domain rule still applies: create, and for the publish intent publish it.
 * Nothing is rolled back: when publishing is refused the intensivo stays a
 * draft and the missing publish rules are returned.
 */
export async function publishQuickIntensive(
  intensives: IntensivesService,
  actor: AdminActor,
  input: QuickIntensiveInput,
): Promise<QuickIntensiveOutcome> {
  const created = await createWithUniqueSlug(intensives, actor, input.draft);
  if (!created.ok) {
    if (created.error.kind === "invalid")
      return { kind: "invalid", issues: reportedOnName(created.error.issues) };
    return { kind: "failed", failure: created.error };
  }
  const id = created.value.id;
  if (input.intent !== "publish") return { kind: "saved", id };
  const published = await intensives.publish(actor, id);
  if (published.ok) return { kind: "published", id };
  return {
    kind: "partial",
    id,
    rules: published.error.kind === "rules-unmet" ? published.error.rules : [],
  };
}
