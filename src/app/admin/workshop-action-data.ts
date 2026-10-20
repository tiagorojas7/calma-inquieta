import { data } from "react-router";
import type { FieldIssue } from "~/modules/_shared";
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
import { failureResponse } from "./failure-response";
import {
  WORKSHOP_FIELD_MESSAGES,
  fieldErrors,
  publishRulesMessage,
  transitionRefusedMessage,
  workshopRuleMessage,
} from "./issue-messages";
import { formatPercentage, formatWholePesos } from "./workshop-form-data";

export type WorkshopFormValues = Omit<
  MonthlyWorkshopDraft,
  "images" | "confirmSlugChange"
>;

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
  const { images: _images, confirmSlugChange: _confirm, ...values } = draft;
  return data<WorkshopActionData>(
    {
      values,
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
): Promise<readonly TeacherOption[]> {
  const listed = await teachers.list(actor, "all");
  if (!listed.ok) throw failureResponse(listed.error);
  const assigned = current?.assignment?.teacher.id;
  return listed.value
    .filter((teacher) => teacher.active || teacher.id === assigned)
    .map((teacher) => ({
      id: teacher.id,
      name: teacher.active ? teacher.name : `${teacher.name} (archivado)`,
      modality: teacher.modality,
    }));
}
