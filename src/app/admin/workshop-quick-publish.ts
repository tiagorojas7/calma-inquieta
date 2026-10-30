import type { FieldIssue } from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import {
  slugify,
  type MonthlyWorkshopField,
  type MonthlyWorkshopsService,
  type WorkshopPeriodsService,
} from "~/modules/workshops";
import { formatPercentage, formatWholePesos } from "./workshop-form-data";
import type { QuickWorkshopInput } from "./workshop-quick-form";

export interface QuickServices {
  readonly monthlyWorkshops: MonthlyWorkshopsService;
  readonly workshopPeriods: WorkshopPeriodsService;
}

/** The step that stopped the one-click flow once the taller already existed. */
export type QuickStep = "turnos" | "publish" | "month" | "materials" | "enroll";

type Failure = { readonly kind: "denied" | "unavailable" | "not-found" };

export type QuickOutcome =
  | {
      readonly kind: "invalid";
      readonly issues: readonly FieldIssue<MonthlyWorkshopField>[];
    }
  | { readonly kind: "no-turnos" }
  | { readonly kind: "saved"; readonly id: string }
  | { readonly kind: "published"; readonly id: string }
  | {
      readonly kind: "partial";
      readonly id: string;
      readonly step: QuickStep;
    }
  | { readonly kind: "failed"; readonly failure: Failure };

const MAX_SLUG_ATTEMPTS = 50;

function isDuplicateSlug(issue: FieldIssue<MonthlyWorkshopField>): boolean {
  return issue.field === "slug" && issue.code === "duplicate";
}

/**
 * The slug is never typed here, so a slug problem belongs to the name it was
 * derived from: an empty or symbol-only name yields no slug at all.
 */
function reportedOnName(
  issues: readonly FieldIssue<MonthlyWorkshopField>[],
): FieldIssue<MonthlyWorkshopField>[] {
  const mapped = issues.map((issue) =>
    issue.field === "slug" ? { ...issue, field: "name" as const } : issue,
  );
  const seen = new Set<string>();
  return mapped.filter((issue) => {
    if (seen.has(issue.field)) return false;
    seen.add(issue.field);
    return true;
  });
}

/**
 * Creates the taller with a slug made from its name, suffixed -2, -3... while
 * another taller holds it. Only the slug is retried; any other issue is
 * returned as it came.
 */
async function createWithUniqueSlug(
  services: QuickServices,
  actor: AdminActor,
  input: QuickWorkshopInput,
) {
  const base = slugify(input.draft.name);
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = base && attempt > 1 ? `${base}-${String(attempt)}` : base;
    const created = await services.monthlyWorkshops.create(actor, {
      ...input.draft,
      slug,
    });
    if (
      created.ok ||
      created.error.kind !== "invalid" ||
      !created.error.issues.some(isDuplicateSlug) ||
      !base
    )
      return created;
  }
  return services.monthlyWorkshops.create(actor, {
    ...input.draft,
    slug: `${base}-${String(Date.now())}`,
  });
}

/**
 * The one-page "Nuevo taller" flow over the existing services, so every domain
 * rule still applies: create, add the turnos, and for the publish intent
 * publish the taller, open the current Córdoba month (which copies the turno
 * capacities and the fee), set the chosen materials and publish the month.
 * Nothing is rolled back: once the taller exists, a failing step stops the
 * flow and is named, and what was saved stays saved (a draft taller, or a
 * published one with a draft month).
 */
export async function publishQuickWorkshop(
  services: QuickServices,
  actor: AdminActor,
  input: QuickWorkshopInput,
): Promise<QuickOutcome> {
  const publishing = input.intent === "publish";
  if (publishing && input.turnos.length === 0) return { kind: "no-turnos" };

  const created = await createWithUniqueSlug(services, actor, input);
  if (!created.ok) {
    if (created.error.kind === "invalid")
      return { kind: "invalid", issues: reportedOnName(created.error.issues) };
    return { kind: "failed", failure: created.error };
  }
  const id = created.value.id;
  const partial = (step: QuickStep): QuickOutcome => ({
    kind: "partial",
    id,
    step,
  });

  for (const { draft } of input.turnos) {
    const added = await services.monthlyWorkshops.addTurno(actor, id, draft);
    if (!added.ok) return partial("turnos");
  }
  if (!publishing) return { kind: "saved", id };

  const published = await services.monthlyWorkshops.publish(actor, id);
  if (!published.ok) return partial("publish");

  const listed = await services.workshopPeriods.list(actor, id);
  const month = listed.ok ? listed.value.suggestedNext : null;
  if (month === null) return partial("month");
  const opened = await services.workshopPeriods.openMonth(actor, id, month);
  if (!opened.ok) return partial("month");

  if (input.materialIds.length > 0) {
    const period = opened.value;
    const updated = await services.workshopPeriods.update(actor, period.id, {
      fee: formatWholePesos(period.fee),
      materialsRequired: true,
      projectTitle: period.project.title,
      projectDescription: period.project.description,
      projectImages: [],
      capacities: period.turnos.map((turno) => ({
        turnoId: turno.turnoId,
        capacity: String(turno.capacity),
      })),
      snapshotPercentage:
        period.snapshot.modality === "third_party"
          ? formatPercentage(period.snapshot.percentage)
          : "",
      materialIds: input.materialIds,
    });
    if (!updated.ok) return partial("materials");
  }

  const live = await services.workshopPeriods.publish(actor, opened.value.id);
  if (!live.ok) return partial("enroll");
  return { kind: "published", id };
}

export type OpenNextOutcome =
  | { readonly kind: "opened"; readonly period: string }
  /** The month stays a draft because publishing it was refused. */
  | { readonly kind: "unpublished"; readonly period: string }
  | { readonly kind: "refused" }
  | { readonly kind: "failed"; readonly failure: Failure };

/**
 * "Abrir <mes>": opens the month, which copies the previous one (fee,
 * materials, project and capacities), and publishes it in the same click.
 */
export async function openNextMonth(
  services: QuickServices,
  actor: AdminActor,
  workshopId: string,
  period: string,
): Promise<OpenNextOutcome> {
  const opened = await services.workshopPeriods.openMonth(
    actor,
    workshopId,
    period,
  );
  if (!opened.ok) {
    const { kind } = opened.error;
    return kind === "denied" || kind === "unavailable" || kind === "not-found"
      ? { kind: "failed", failure: { kind } }
      : { kind: "refused" };
  }
  const live = await services.workshopPeriods.publish(actor, opened.value.id);
  return live.ok ? { kind: "opened", period } : { kind: "unpublished", period };
}
