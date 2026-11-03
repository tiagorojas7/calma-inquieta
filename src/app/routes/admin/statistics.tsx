import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { toStatisticsScreen } from "~/app/admin/insights-view";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { toMaterialsRecord } from "~/app/admin/materials-record";
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
  const { insights, consolidation } = context.get(servicesContext);
  const query = isPeriod(month) ? { period: month } : {};
  const found = await insights.earnings(actor, query);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  const { period } = found.value;
  // The record is an addition: a failed read leaves it empty, never the page.
  const record = await consolidation.deliveries(actor, period);
  return {
    ...toStatisticsScreen(found.value),
    materialsRecord: record.ok ? toMaterialsRecord(record.value) : [],
    materialsRecordHref: `/admin/estadisticas/materiales?mes=${period}`,
  };
}

export default function AdminStatistics() {
  return <StatisticsScreen {...useLoaderData<typeof loader>()} />;
}
