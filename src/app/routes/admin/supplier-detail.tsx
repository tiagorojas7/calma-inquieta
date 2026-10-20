import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { issueMessage } from "~/app/admin/issue-messages";
import { invalidSupplierResponse } from "~/app/admin/supplier-action-data";
import {
  parseSupplierDraft,
  parseSupplierIntent,
} from "~/app/admin/supplier-form-data";
import { Heading } from "~/app/ui/atoms/heading";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { SupplierForm, SupplierStatePanel } from "~/app/ui/admin/supplier-form";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/supplier-detail";

const copy = adminMicrocopy.suppliers;
const LIST = "/admin/materiales/proveedores";

export function meta() {
  return [{ title: "Editar proveedor | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const found = await context
    .get(servicesContext)
    .suppliers.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  const supplier = found.value;
  return {
    id: supplier.id,
    active: supplier.active,
    values: {
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      notes: supplier.notes ?? "",
    },
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const suppliers = context.get(servicesContext).suppliers;
  const form = await request.formData();
  const intent = parseSupplierIntent(form);
  if (intent === null) throw data(null, { status: 400 });

  if (intent === "save") {
    const draft = parseSupplierDraft(form);
    const saved = await suppliers.update(actor, params.id, draft);
    if (saved.ok) return redirect(LIST);
    if (saved.error.kind === "invalid")
      return invalidSupplierResponse(draft, saved.error.issues);
    throw failureResponse(saved.error);
  }

  const toggled =
    intent === "archive"
      ? await suppliers.archive(actor, params.id)
      : await suppliers.reactivate(actor, params.id);
  if (toggled.ok) return redirect(`${LIST}/${params.id}`);
  if (toggled.error.kind === "invalid") {
    const [first] = toggled.error.issues;
    return data(
      { stateError: first ? issueMessage(first.code) : copy.form.saveFailed },
      { status: 422 },
    );
  }
  throw failureResponse(toggled.error);
}

export default function AdminSupplierDetail() {
  const supplier = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const formRejected = rejected && "values" in rejected ? rejected : null;
  const stateError =
    rejected && "stateError" in rejected ? rejected.stateError : undefined;
  return (
    <section className="flex flex-col gap-6">
      <Heading level={1}>{copy.editTitle}</Heading>
      <SupplierStatePanel active={supplier.active} error={stateError} />
      <SupplierForm
        key={supplier.id}
        values={formRejected?.values ?? supplier.values}
        errors={formRejected?.errors ?? {}}
        formError={formRejected?.formError}
        submitLabel={copy.form.save}
        cancelHref={LIST}
      />
    </section>
  );
}
