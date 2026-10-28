import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { isUuid } from "~/app/admin/enrollment-ids";
import { failureResponse } from "~/app/admin/failure-response";
import { privateEventDetail } from "~/app/private-events/admin-view";
import { PrivateEventDetail } from "~/app/ui/admin/private-event-detail";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { isPrivateEventStatus } from "~/modules/private-events";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/private-event-detail";

export function meta() {
  return [{ title: "Consulta de evento | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const found = await context
    .get(servicesContext)
    .privateEvents.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  return privateEventDetail(found.value);
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const status = form.get("status");
  if (typeof status !== "string" || !isPrivateEventStatus(status))
    return data(
      { formError: adminMicrocopy.privateEvents.statusForm.failed },
      { status: 422 },
    );
  const updated = await context
    .get(servicesContext)
    .privateEvents.setStatus(actor, params.id, status);
  if (!updated.ok) throw failureResponse(updated.error);
  return redirect(`/admin/eventos/${params.id}`);
}

export default function AdminPrivateEventDetail() {
  const request = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <PrivateEventDetail request={request} formError={rejected?.formError} />
  );
}
