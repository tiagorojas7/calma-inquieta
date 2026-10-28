import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { toPanelSummary } from "~/app/admin/insights-view";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { AdminLanding } from "~/app/ui/admin/admin-landing";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/home";

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const panel = await context.get(servicesContext).insights.panel(actor);
  if (!panel.ok) throw enrollmentFailureResponse(panel.error);
  return { email: actor.email, summary: toPanelSummary(panel.value) };
}

export default function AdminHome() {
  const { email, summary } = useLoaderData<typeof loader>();
  return <AdminLanding email={email} summary={summary} />;
}
