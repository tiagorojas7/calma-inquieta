import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import {
  toStatisticsScreen,
  toTeacherSettlementRows,
} from "~/app/admin/insights-view";
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
  const { insights } = context.get(servicesContext);
  const query = isPeriod(month) ? { period: month } : {};
  const found = await insights.statistics(actor, query);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  // Same period as the statistics, whichever fallback they used.
  const settled = await insights.settlements(actor, {
    period: found.value.period,
  });
  if (!settled.ok) throw enrollmentFailureResponse(settled.error);
  return {
    ...toStatisticsScreen(found.value),
    teachers: toTeacherSettlementRows(settled.value),
  };
}

export default function AdminStatistics() {
  return <StatisticsScreen {...useLoaderData<typeof loader>()} />;
}
