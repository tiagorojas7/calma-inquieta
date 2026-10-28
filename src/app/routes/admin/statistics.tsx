import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { toStatisticsScreen } from "~/app/admin/insights-view";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { StatisticsScreen } from "~/app/ui/admin/statistics-screen";
import { isPeriod } from "~/modules/insights";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/statistics";

export function meta() {
  return [{ title: "Estadísticas | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const month = new URL(request.url).searchParams.get("mes") ?? "";
  // A malformed month falls back to the current one, never to an error.
  const found = await context
    .get(servicesContext)
    .insights.statistics(actor, isPeriod(month) ? { period: month } : {});
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  return toStatisticsScreen(found.value);
}

export default function AdminStatistics() {
  return <StatisticsScreen {...useLoaderData<typeof loader>()} />;
}
