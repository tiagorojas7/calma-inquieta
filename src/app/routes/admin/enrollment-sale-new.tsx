import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { isUuid } from "~/app/admin/enrollment-ids";
import { loadMaterialChoices } from "./enrollment-material-choices";
import {
  MATERIAL_UNAVAILABLE,
  materialsRefusal,
  parseMaterialLines,
} from "~/app/admin/enrollment-new-form-data";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { withFeedback } from "~/app/admin/feedback-code";
import { monthLabel } from "~/app/enrollment/order-labels";
import { AdminPageHeader } from "~/app/ui/admin/admin-page";
import {
  EnrollmentSaleNewForm,
  enrollmentSaleNewCopy as copy,
} from "~/app/ui/admin/enrollment-sale-new-form";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-sale-new";

const LIST = "/admin/inscripciones";

const NO_MATERIALS = "Elegí al menos un material.";
const NOT_SELLABLE =
  "Esta inscripción está cancelada: ya no admite ventas de materiales.";

export function meta() {
  return [{ title: "Nueva venta de materiales | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const services = context.get(servicesContext);
  const found = await services.enrollments.detail(actor, params.id);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  const order = found.value;
  // Only an active monthly record takes a sale; anything else goes back to it.
  if (order.kind === "material_sale" || order.status === "cancelled")
    return redirect(`${LIST}/${order.id}`);
  return {
    order: {
      id: order.id,
      number: order.number,
      studentName: order.student.fullName,
      workshopName: order.workshopName,
      month: monthLabel(order.period),
    },
    materials: await loadMaterialChoices(services, actor),
  };
}

function rejection(
  errors: { materials?: string },
  status: 409 | 422,
  lines: readonly { materialId: string; variantId: string; quantity: string }[],
  formError?: string,
) {
  return data({ errors, lines, formError }, { status });
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const chosen = parseMaterialLines(form);
  if (chosen.malformed)
    return rejection({ materials: MATERIAL_UNAVAILABLE }, 422, chosen.lines);
  if (chosen.cartLines.length === 0)
    return rejection({ materials: NO_MATERIALS }, 422, chosen.lines);
  const created = await context
    .get(servicesContext)
    .enrollments.createMaterialSale(actor, {
      orderId: params.id,
      lines: chosen.cartLines,
    });
  if (created.ok)
    return redirect(
      withFeedback(`${LIST}/${created.value.id}`, "sale-created"),
    );
  if (created.error.kind === "not-sellable")
    return rejection({}, 409, chosen.lines, NOT_SELLABLE);
  if (created.error.kind === "empty-sale")
    return rejection({ materials: NO_MATERIALS }, 422, chosen.lines);
  const materials = materialsRefusal(created.error);
  if (materials !== null) return rejection({ materials }, 422, chosen.lines);
  throw enrollmentFailureResponse(created.error);
}

export default function AdminEnrollmentSaleNew() {
  const { order, materials } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const back = `${LIST}/${order.id}`;
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: "Inscripciones", href: LIST },
          { label: order.number, href: back },
          { label: copy.title },
        ]}
        back={{ href: back, label: copy.back }}
      />
      <EnrollmentSaleNewForm
        order={order}
        materials={materials}
        lines={rejected?.lines ?? []}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        cancelHref={back}
      />
    </section>
  );
}
