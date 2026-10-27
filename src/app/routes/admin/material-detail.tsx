import { data, redirect, useActionData, useLoaderData } from "react-router";
import { failureResponse } from "~/app/admin/failure-response";
import { issueMessage } from "~/app/admin/issue-messages";
import { isUuid } from "~/app/admin/enrollment-ids";
import { servicesContext } from "~/app/context";
import { MaterialDetail } from "~/app/ui/admin/material-detail";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/material-detail";

const LIST = "/admin/materiales";
const copy = adminMicrocopy.materialDetail;

function auditDate(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function meta() {
  return [{ title: "Detalle de material | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });

  const services = context.get(servicesContext);
  const found = await services.materials.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  const material = found.value;
  const listed = await services.suppliers.list(actor, { active: true });
  if (!listed.ok) throw failureResponse(listed.error);

  const suppliers = [...listed.value];
  if (!suppliers.some((supplier) => supplier.id === material.supplier.id))
    suppliers.push(material.supplier);

  const image = material.image;
  return {
    id: material.id,
    name: material.name,
    description: material.description,
    category: material.category,
    active: material.active,
    available: material.available,
    supplierId: material.supplier.id,
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.active ? supplier.name : `${supplier.name} (archivado)`,
    })),
    image: image
      ? image.asset?.src === undefined
        ? { alt: image.alt }
        : { alt: image.alt, src: image.asset.src }
      : null,
    variants: material.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      price: String(variant.price.toCentavos() / 100),
      available: variant.available,
      used: variant.used,
      swatch: variant.swatch,
    })),
    audit: {
      updatedBy: material.audit.updatedBy,
      updatedAt: auditDate(material.audit.updatedAt),
    },
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });

  const form = await request.formData();
  const intent = form.get("intent");
  if (intent !== "deactivate" && intent !== "reactivate")
    throw data(null, { status: 400 });

  const materials = context.get(servicesContext).materials;
  const changed =
    intent === "deactivate"
      ? await materials.deactivate(actor, params.id)
      : await materials.reactivate(actor, params.id);
  if (!changed.ok) {
    if (changed.error.kind === "invalid") {
      const [first] = changed.error.issues;
      return data(
        {
          stateError: first ? issueMessage(first.code) : copy.lifecycle.failed,
        },
        { status: 422 },
      );
    }
    throw failureResponse(changed.error);
  }
  return redirect(`${LIST}/${params.id}`);
}

export default function AdminMaterialDetail() {
  const material = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const stateError =
    rejected && "stateError" in rejected ? rejected.stateError : undefined;
  return <MaterialDetail {...material} stateError={stateError} />;
}
