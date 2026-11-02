import { data, redirect, useActionData, useLoaderData } from "react-router";
import { failureResponse } from "~/app/admin/failure-response";
import { withFeedback } from "~/app/admin/feedback-code";
import { isUuid } from "~/app/admin/enrollment-ids";
import { uploadChosenImage } from "~/app/admin/upload-chosen-image";
import { servicesContext } from "~/app/context";
import { materialCatalogCopy } from "~/app/ui/admin/material-catalog-copy";
import { MaterialPhoto } from "~/app/ui/admin/material-photo";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/material-photo";

const copy = materialCatalogCopy.photo;
const LIST = "/admin/materiales";

/** Back to the list, keeping the "Sin foto" filter when it was on. */
function listPath(request: Request): string {
  const keep = new URL(request.url).searchParams.get("sinfoto") === "1";
  return keep ? `${LIST}?sinfoto=1` : LIST;
}

export function meta() {
  return [{ title: "Foto del material | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const found = await context
    .get(servicesContext)
    .materials.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  const image = found.value.image;
  return {
    name: found.value.name,
    backHref: listPath(request),
    current:
      image?.asset?.src === undefined
        ? null
        : { assetId: image.assetId, src: image.asset.src, alt: image.alt },
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const form = await request.formData();
  const assetId = form.get("imageAssetId");
  const alt = form.get("imageAlt");
  const saved = await context
    .get(servicesContext)
    .materials.setImage(actor, params.id, {
      assetId: typeof assetId === "string" ? assetId : "",
      alt: typeof alt === "string" ? alt : "",
    });
  if (saved.ok) return redirect(withFeedback(listPath(request), "photo"));
  if (saved.error.kind === "invalid")
    return data({ formError: copy.saveFailed }, { status: 422 });
  throw failureResponse(saved.error);
}

export default function AdminMaterialPhoto() {
  const { name, current, backHref } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <MaterialPhoto
      name={name}
      current={current ?? undefined}
      upload={uploadChosenImage}
      backHref={backHref}
      formError={rejected?.formError}
    />
  );
}
