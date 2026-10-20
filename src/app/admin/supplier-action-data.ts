import { data } from "react-router";
import type { FieldIssue } from "~/modules/_shared";
import type { SupplierDraft, SupplierField } from "~/modules/materials";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { fieldErrors } from "./issue-messages";

/** What a rejected supplier form hands back to its screen. */
export interface SupplierActionData {
  readonly values: SupplierDraft;
  readonly errors: Partial<Record<SupplierField, string>>;
  readonly formError: string;
}

/**
 * A 422 for a rejected draft: the typed values come back so the form keeps
 * them, with one Spanish message per field.
 */
export function invalidSupplierResponse(
  values: SupplierDraft,
  issues: readonly FieldIssue<SupplierField>[],
) {
  return data<SupplierActionData>(
    {
      values,
      errors: fieldErrors(issues),
      formError: adminMicrocopy.suppliers.form.saveFailed,
    },
    { status: 422 },
  );
}
