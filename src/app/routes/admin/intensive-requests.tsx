import { data, useActionData, useLoaderData } from "react-router";
import { runReservationAction } from "./classes-reservation-action";
import { feedbackCode } from "~/app/admin/feedback-code";
import { isUuid } from "~/app/admin/enrollment-ids";
import { failureResponse } from "~/app/admin/failure-response";
import { markOpened } from "~/app/admin/notifications-view";
import { servicesContext } from "~/app/context";
import { intensiveRequestsView } from "~/app/intensive-requests/admin-view";
import { IntensiveRequestsScreen } from "~/app/ui/admin/intensive-requests";
import { cordobaDateOf } from "~/modules/intensive-requests";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/intensive-requests";

const DONE = ["confirmed", "balance", "cancelled"] as const;

export function meta() {
  return [{ title: "Reservas | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const { intensiveRequests } = context.get(servicesContext);
  const found = await intensiveRequests.overview(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  // Opening the reservations reads every request of this workshop for both owners.
  await markOpened(() => intensiveRequests.markSeen(actor, params.id));
  return {
    ...intensiveRequestsView(found.value, cordobaDateOf(new Date())),
    done: feedbackCode(request, DONE),
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  return runReservationAction({
    actor,
    requests: context.get(servicesContext).intensiveRequests,
    form,
    intensiveId: params.id,
    fallback: `/admin/intensivos/${params.id}/reservas`,
  });
}

export default function AdminIntensiveRequests() {
  const { done, ...view } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <IntensiveRequestsScreen
      view={view}
      feedback={rejected?.feedback}
      done={done}
    />
  );
}
