import { data, redirect, useActionData, useLoaderData } from "react-router";
import {
  materialFormErrors,
  parseMaterialDraft,
} from "~/app/admin/material-form-data";
import { failureResponse } from "~/app/admin/failure-response";
import { uploadChosenImage } from "~/app/admin/upload-chosen-image";
import { servicesContext } from "~/app/context";
import { Heading } from "~/app/ui/atoms/heading";
import {
  MaterialForm,
  type MaterialFormValues,
} from "~/app/ui/admin/material-form";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/material-new";

const LIST = "/admin/materiales";
const copy = adminMicrocopy.materialForm;

const EMPTY: MaterialFormValues = {
  name: "",
  description: "",
  category: "",
  supplierId: "",
  available: true,
  image: null,
  variants: [],
};

function imageSource(form: FormData): string {
  const value = form.get("imageSrc");
  return typeof value === "string" ? value : "";
}

function rejectedValues(form: FormData): MaterialFormValues {
  const draft = parseMaterialDraft(form);
  return {
    ...draft,
    image: draft.image ? { ...draft.image, src: imageSource(form) } : null,
  };
}

export function meta() {
  return [{ title: "Nuevo material | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const suppliers = await context
    .get(servicesContext)
    .suppliers.list(actor, { active: true });
  if (!suppliers.ok) throw failureResponse(suppliers.error);
  return {
    suppliers: suppliers.value.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
    })),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const values = rejectedValues(form);
  const created = await context
    .get(servicesContext)
    .materials.create(actor, parseMaterialDraft(form));
  if (created.ok) return redirect(LIST);
  if (created.error.kind === "invalid") {
    return data(
      {
        values,
        errors: materialFormErrors(created.error.issues),
        formError: copy.saveFailed,
      },
      { status: 422 },
    );
  }
  if (created.error.kind === "variant-in-use")
    throw failureResponse({ kind: "unavailable" });
  throw failureResponse(created.error);
}

export default function AdminMaterialNew() {
  const { suppliers } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>Nuevo material</Heading>
      <MaterialForm
        values={rejected?.values ?? EMPTY}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        suppliers={suppliers}
        upload={uploadChosenImage}
        submitLabel="Guardar"
        cancelHref={LIST}
      />
    </section>
  );
}
