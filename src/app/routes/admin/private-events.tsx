import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  PRIVATE_EVENT_STATUS_OPTIONS,
  parsePrivateEventFilter,
  privateEventRow,
} from "~/app/private-events/admin-view";
import { PrivateEventsList } from "~/app/ui/admin/private-events-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/private-events";

export function meta() {
  return [{ title: "Eventos privados | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const filter = parsePrivateEventFilter(
    new URL(request.url).searchParams.get("estado"),
  );
  const listed = await context
    .get(servicesContext)
    .privateEvents.list(actor, filter);
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    filter: filter === "all" ? "" : filter,
    statusOptions: PRIVATE_EVENT_STATUS_OPTIONS,
    rows: listed.value.map(privateEventRow),
  };
}

export default function AdminPrivateEvents() {
  return <PrivateEventsList {...useLoaderData<typeof loader>()} />;
}
