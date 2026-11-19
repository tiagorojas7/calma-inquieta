import { data, redirect, useActionData, useLoaderData } from "react-router";
import { failureResponse } from "~/app/admin/failure-response";
import { withFeedback } from "~/app/admin/feedback-code";
import {
  materialFormErrors,
  parseMaterialDraft,
} from "~/app/admin/material-form-data";
import { materialAnchor } from "~/app/admin/material-stock-view";
import { uploadChosenImage } from "~/app/admin/upload-chosen-image";
import { servicesContext } from "~/app/context";
import { AdminPageHeader } from "~/app/ui/admin/admin-page";
import { adminCopy } from "~/app/ui/admin/copy";
import {
  EMPTY_QUICK_VALUES,
  MaterialQuickForm,
  type MaterialQuickErrors,
  type MaterialQuickValues,
} from "~/app/ui/admin/material-quick-form";
import type { FieldIssue } from "~/modules/_shared";
import type { MaterialDraft, MaterialField } from "~/modules/materials";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/material-new";

const LIST = "/admin/materiales";
const copy = adminCopy.materiales.form;
/** What a short form leaves blank: the material service still requires both. */
const DEFAULT_CATEGORY = "General";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/** The submitted draft with the two fields the short form does not ask for filled in. */
function draftOf(form: FormData): MaterialDraft {
  const draft = parseMaterialDraft(form);
  return {
    ...draft,
    description:
      draft.description.trim() === "" ? draft.name : draft.description,
    category: draft.category.trim() === "" ? DEFAULT_CATEGORY : draft.category,
  };
}

function rejectedValues(form: FormData): MaterialQuickValues {
  const draft = parseMaterialDraft(form);
  const [first, ...others] = draft.variants;
  return {
    name: draft.name,
    price: first?.price ?? "",
    stock: text(form, "startingStock"),
    supplierId: draft.supplierId,
    category: draft.category,
    description: draft.description,
    cost: first?.cost ?? "",
    priceOnRequest: first?.priceOnRequest === true,
    available: draft.available,
    image: draft.image ? { ...draft.image, src: text(form, "imageSrc") } : null,
    extras: others.map((variant) => ({
      label: variant.label,
      price: variant.price,
      cost: variant.cost ?? "",
    })),
  };
}

function quickErrors(
  issues: readonly FieldIssue<MaterialField | "startingStock">[],
): MaterialQuickErrors {
  const stock = issues.find((issue) => issue.field === "startingStock");
  const own = materialFormErrors(
    issues.filter(
      (issue): issue is FieldIssue<MaterialField> =>
        issue.field !== "startingStock",
    ),
  );
  const rows = own.variants?.rows ?? [];
  const [first, ...others] = rows;
  return {
    ...(own.name ? { name: own.name } : {}),
    ...(own.description ? { description: own.description } : {}),
    ...(own.category ? { category: own.category } : {}),
    ...(own.supplierId ? { supplierId: own.supplierId } : {}),
    ...(own.image ? { image: own.image } : {}),
    ...(first?.price ? { price: first.price } : {}),
    ...(first?.cost ? { cost: first.cost } : {}),
    ...(stock
      ? {
          stock:
            stock.code === "out-of-range"
              ? copy.stockTooMany
              : copy.stockInvalid,
        }
      : {}),
    ...(others.length > 0 ? { extras: others } : {}),
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
  const created = await context
    .get(servicesContext)
    .materials.createWithStock(
      actor,
      draftOf(form),
      text(form, "startingStock"),
    );
  if (created.ok) {
    const id = created.value.material.id;
    return redirect(
      `${withFeedback(LIST, "created")}&nuevo=${encodeURIComponent(id)}#${materialAnchor(id)}`,
    );
  }
  if (created.error.kind === "invalid")
    return data(
      {
        values: rejectedValues(form),
        errors: quickErrors(created.error.issues),
        formError: copy.saveFailed,
      },
      { status: 422 },
    );
  if (created.error.kind === "variant-in-use")
    throw failureResponse({ kind: "unavailable" });
  throw failureResponse(created.error);
}

export default function AdminMaterialNew() {
  const { suppliers } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        back={{ href: LIST, label: copy.back }}
      />
      <MaterialQuickForm
        values={rejected?.values ?? EMPTY_QUICK_VALUES}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        suppliers={suppliers}
        upload={uploadChosenImage}
        cancelHref={LIST}
      />
    </section>
  );
}
