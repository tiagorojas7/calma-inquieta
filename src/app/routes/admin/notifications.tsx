import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { toNotificationsScreen } from "~/app/admin/notifications-view";
import { AdminNotifications } from "~/app/ui/admin/notifications";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/notifications";

export function meta() {
  return [{ title: "Novedades | Panel | Calma Inquieta" }];
}

/**
 * The bell page. It only reads: opening a request is what marks it read, so
 * looking at this list leaves every novelty unopened.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const view = await context.get(servicesContext).insights.notifications(actor);
  if (!view.ok) throw enrollmentFailureResponse(view.error);
  return toNotificationsScreen(view.value);
}

export default function AdminNotificationsRoute() {
  const { novelties, payments } = useLoaderData<typeof loader>();
  return <AdminNotifications novelties={novelties} payments={payments} />;
}
