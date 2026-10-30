import { servicesContext } from "~/app/context";
import { earningsCsv } from "~/app/admin/earnings-csv";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { isPeriod } from "~/modules/insights";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/statistics-download";

/**
 * `GET /admin/estadisticas/planilla?mes=YYYY-MM`: the main statistics table
 * as a CSV Excel opens directly. A plain download link, never a `.data` fetch.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const month = new URL(request.url).searchParams.get("mes") ?? "";
  const { insights } = context.get(servicesContext);
  const found = await insights.earnings(
    actor,
    isPeriod(month) ? { period: month } : {},
  );
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  return new Response(earningsCsv(found.value), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calma-inquieta-${found.value.period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
