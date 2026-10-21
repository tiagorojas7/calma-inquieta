import { data } from "react-router";
import type { FieldIssue } from "~/modules/_shared";
import type { TurnoDraft, TurnoField } from "~/modules/workshops";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { TURNO_FIELD_MESSAGES, fieldErrors } from "./issue-messages";

/** What a rejected turno form hands back to its screen. */
export interface TurnoActionData {
  readonly values: TurnoDraft;
  readonly errors: Partial<Record<TurnoField, string>>;
  readonly formError: string;
  /** The turno being edited, empty when the form adds one. */
  readonly turnoId: string;
}

/**
 * A 422 for a rejected turno: the typed values come back so the form keeps
 * them, with one Spanish message per field.
 */
export function invalidTurnoResponse(
  draft: TurnoDraft,
  turnoId: string,
  issues: readonly FieldIssue<TurnoField>[],
) {
  return data<TurnoActionData>(
    {
      values: draft,
      errors: fieldErrors(issues, TURNO_FIELD_MESSAGES),
      formError: adminMicrocopy.workshops.turnos.form.saveFailed,
      turnoId,
    },
    { status: 422 },
  );
}

/** A 422 for a refused row action, worded for the list. */
export function turnoRefusedResponse(listError: string) {
  return data({ listError }, { status: 422 });
}
