import { redirect, useActionData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { invalidSupplierResponse } from "~/app/admin/supplier-action-data";
import { parseSupplierDraft } from "~/app/admin/supplier-form-data";
import { Heading } from "~/app/ui/atoms/heading";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { SupplierForm } from "~/app/ui/admin/supplier-form";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/supplier-new";

const copy = adminMicrocopy.suppliers;
const LIST = "/admin/materiales/proveedores";

const EMPTY = { name: "", phone: "", email: "", notes: "" };

export function meta() {
  return [{ title: "Nuevo proveedor | Panel | Calma Inquieta" }];
}

export function loader({ request, context }: Route.LoaderArgs) {
  requireAdmin(request, context);
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const draft = parseSupplierDraft(await request.formData());
  const created = await context
    .get(servicesContext)
    .suppliers.create(actor, draft);
  if (created.ok) return redirect(LIST);
  if (created.error.kind === "invalid")
    return invalidSupplierResponse(draft, created.error.issues);
  throw failureResponse(created.error);
}

export default function AdminSupplierNew() {
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.newTitle}</Heading>
      <SupplierForm
        values={rejected?.values ?? EMPTY}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        submitLabel={copy.form.save}
        cancelHref={LIST}
      />
    </section>
  );
}
