import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { loadEmptyMonthTasks } from "~/app/admin/empty-months";
import { toPanelSummary } from "~/app/admin/insights-view";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { AdminLanding } from "~/app/ui/admin/admin-landing";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/home";

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const [panel, events] = await Promise.all([
    services.insights.panel(actor),
    services.privateEvents.list(actor, "nueva"),
  ]);
  if (!panel.ok) throw enrollmentFailureResponse(panel.error);
  // An enquiry count that cannot be read must not hide the rest of the day.
  const privateEventsUnanswered = events.ok ? events.value.length : 0;
  const emptyMonths = await loadEmptyMonthTasks(
    services,
    actor,
    panel.value.period,
  );
  return {
    summary: toPanelSummary(panel.value, {
      privateEventsUnanswered,
      emptyMonths,
    }),
  };
}

export default function AdminHome() {
  const { summary } = useLoaderData<typeof loader>();
  return <AdminLanding summary={summary} />;
}
