import { redirect, useActionData } from "react-router";
import {
  consolidationAction,
  DELIVER_ANCHOR,
  MATERIALS_PATH,
  ORDER_ANCHOR,
  periodOf,
} from "./enrollment-consolidation-view";
import { adminCopy } from "~/app/ui/admin/copy";
import { FormError } from "~/app/ui/admin/form-fields";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-consolidation";

const copy = adminCopy.materiales;

/**
 * The old Materiales page now lives in Materiales. It keeps its address: a
 * visit goes to the new screen with the same month and notice, and a post
 * (forms elsewhere may still send one here) is handled as before.
 */
export function loader({ request, context }: Route.LoaderArgs) {
  requireAdmin(request, context);
  const params = new URL(request.url).searchParams;
  const target = new URLSearchParams();
  const month = params.get("mes");
  if (month !== null) target.set("mes", periodOf(month));
  for (const key of ["ok", "n"]) {
    const value = params.get(key);
    if (value !== null) target.set(key, value);
  }
  const query = target.toString();
  const anchor =
    params.get("seccion") === "entregar" ? DELIVER_ANCHOR : ORDER_ANCHOR;
  return redirect(
    `${MATERIALS_PATH}${query === "" ? "" : `?${query}`}#${anchor}`,
  );
}

export const action = consolidationAction;

export default function AdminEnrollmentConsolidation() {
  const result = useActionData<typeof action>();
  return (
    <div className="flex flex-col gap-4">
      <FormError message={result?.formError ?? copy.redirect.failed} />
      <a
        href={MATERIALS_PATH}
        className="inline-flex min-h-12 items-center text-lg font-semibold text-clay-800 underline underline-offset-4"
      >
        {copy.redirect.back}
      </a>
    </div>
  );
}
