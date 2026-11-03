import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { materialsRecordCsv } from "~/app/admin/materials-record";
import { isPeriod } from "~/modules/insights";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/statistics-materials-download";

const CORDOBA_OFFSET_MS = 10_800_000;

/**
 * `GET /admin/estadisticas/materiales?mes=YYYY-MM`: the month's materials
 * record as a CSV Excel opens directly. A plain download link, never a
 * `.data` fetch. A malformed month falls back to the current Córdoba month.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const month = new URL(request.url).searchParams.get("mes") ?? "";
  const period = isPeriod(month)
    ? month
    : new Date(Date.now() - CORDOBA_OFFSET_MS).toISOString().slice(0, 7);
  const found = await context
    .get(servicesContext)
    .consolidation.deliveries(actor, period);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  return new Response(materialsRecordCsv(found.value), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calma-inquieta-materiales-${period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
