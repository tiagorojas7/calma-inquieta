import { data } from "react-router";
import type { FieldIssue } from "~/modules/_shared";
import type { TeacherDraft, TeacherField } from "~/modules/teachers";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { fieldErrors } from "./issue-messages";

/** What a rejected teacher form hands back to its screen. */
export interface TeacherActionData {
  readonly values: TeacherDraft;
  readonly errors: Partial<Record<TeacherField, string>>;
  readonly formError: string;
}

/**
 * A 422 for a rejected draft: the typed values come back so the form keeps
 * them, with one Spanish message per field.
 */
export function invalidTeacherResponse(
  values: TeacherDraft,
  issues: readonly FieldIssue<TeacherField>[],
) {
  return data<TeacherActionData>(
    {
      values,
      errors: fieldErrors(issues),
      formError: adminMicrocopy.teachers.form.saveFailed,
    },
    { status: 422 },
  );
}
