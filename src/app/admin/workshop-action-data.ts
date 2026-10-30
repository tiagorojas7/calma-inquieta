import { data } from "react-router";
import {
  ok,
  type AdminFailure,
  type FieldIssue,
  type Result,
} from "~/modules/_shared";
import type { TeachersService } from "~/modules/teachers";
import type {
  MonthlyWorkshop,
  MonthlyWorkshopDraft,
  MonthlyWorkshopField,
  WorkshopPublishRule,
  WorkshopStatus,
} from "~/modules/workshops";
import type { AdminActor } from "~/modules/admin-access";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import {
  WORKSHOP_FIELD_MESSAGES,
  fieldErrors,
  publishRulesMessage,
  transitionRefusedMessage,
  workshopRuleMessage,
} from "./issue-messages";
import type { GalleryFormImage } from "./gallery-form-data";
import { formatPercentage, formatWholePesos } from "./workshop-form-data";

export type WorkshopFormValues = Omit<
  MonthlyWorkshopDraft,
  "images" | "confirmSlugChange"
> & { readonly images: readonly GalleryFormImage[] };

/** What a rejected workshop form hands back to its screen. */
export interface WorkshopActionData {
  readonly values: WorkshopFormValues;
  readonly errors: Partial<Record<MonthlyWorkshopField, string>>;
  readonly formError: string;
}

export interface TeacherOption {
  readonly id: string;
  readonly name: string;
  readonly modality: "own" | "third_party";
}

/**
 * A 422 for a rejected draft: the typed values come back so the form keeps
 * them, with one Spanish message per field.
 */
export function invalidWorkshopResponse(
  draft: MonthlyWorkshopDraft,
  issues: readonly FieldIssue<MonthlyWorkshopField>[],
) {
  return data<WorkshopActionData>(
    {
      values: {
        name: draft.name,
        slug: draft.slug,
        summary: draft.summary,
        description: draft.description,
        technique: draft.technique,
        defaultFee: draft.defaultFee,
        teacherId: draft.teacherId,
        percentage: draft.percentage,
        images: draft.images,
      },
      errors: fieldErrors(issues, WORKSHOP_FIELD_MESSAGES),
      formError: adminMicrocopy.workshops.form.saveFailed,
    },
    { status: 422 },
  );
}

/** A 422 for a refused state change, worded for the state panel. */
export function stateRefusedResponse(stateError: string) {
  return data({ stateError }, { status: 422 });
}

export type StateFailure =
  | {
      readonly kind: "transition-refused";
      from: WorkshopStatus;
      to: WorkshopStatus;
    }
  | {
      readonly kind: "rules-unmet";
      rules: readonly (WorkshopPublishRule | "draft-without-periods")[];
    };

export function stateFailureMessage(failure: StateFailure): string {
  if (failure.kind === "transition-refused")
    return transitionRefusedMessage(failure.from, failure.to);
  const [only, ...rest] = failure.rules;
  if (only === "draft-without-periods" && rest.length === 0)
    return workshopRuleMessage(only);
  return publishRulesMessage(
    failure.rules.filter(
      (rule): rule is WorkshopPublishRule => rule !== "draft-without-periods",
    ),
  );
}

/** The saved workshop as the strings the form shows. */
export function workshopFormValues(
  workshop: MonthlyWorkshop,
): WorkshopFormValues {
  return {
    name: workshop.name,
    slug: workshop.slug,
    summary: workshop.summary,
    description: workshop.description,
    technique: workshop.technique,
    defaultFee: formatWholePesos(workshop.defaultFee),
    teacherId: workshop.assignment?.teacher.id ?? "",
    percentage: formatPercentage(workshop.assignment?.percentage ?? null),
    images: workshop.images.flatMap((image) =>
      image.asset
        ? [{ assetId: image.assetId, src: image.asset.src, alt: image.alt }]
        : [],
    ),
  };
}

/**
 * Active teachers to choose from. A teacher archived after being assigned
 * stays selectable on that workshop, or saving would silently unassign her.
 */
export async function loadTeacherOptions(
  teachers: TeachersService,
  actor: AdminActor,
  current: MonthlyWorkshop | null,
): Promise<Result<readonly TeacherOption[], AdminFailure>> {
  const listed = await teachers.list(actor, "all");
  if (!listed.ok) return listed;
  const assigned = current?.assignment?.teacher.id;
  return ok(
    listed.value
      .filter((teacher) => teacher.active || teacher.id === assigned)
      .map((teacher) => ({
        id: teacher.id,
        name: teacher.active ? teacher.name : `${teacher.name} (archivado)`,
        modality: teacher.modality,
      })),
  );
}
