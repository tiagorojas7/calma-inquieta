import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  parseWorkshopFilter,
  parseWorkshopFilterKey,
} from "~/app/admin/workshop-form-data";
import { workshopReadiness } from "~/app/admin/workshop-readiness";
import { cordobaMonthOf } from "~/modules/workshops";
import { feedbackCode } from "~/app/admin/feedback-code";
import { WorkshopsList } from "~/app/ui/admin/workshops-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshops";

export function meta() {
  return [{ title: "Talleres | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const estado = new URL(request.url).searchParams.get("estado");
  const services = context.get(servicesContext);
  const listed = await services.monthlyWorkshops.list(actor, {
    status: parseWorkshopFilter(estado),
  });
  if (!listed.ok) throw failureResponse(listed.error);
  const month = cordobaMonthOf(new Date());
  const rows = await Promise.all(
    listed.value.map(async (workshop) => {
      const periods = await services.workshopPeriods.list(actor, workshop.id);
      if (!periods.ok) throw failureResponse(periods.error);
      const current = periods.value.periods.find(
        (period) => period.period === month,
      );
      const readiness = workshopReadiness({
        workshopId: workshop.id,
        status: workshop.status,
        activeTurnos: workshop.activeTurnos,
        month,
        period: current
          ? {
              status: current.status,
              totalCapacity: current.totalCapacity,
              materialsRequired: false,
              materialsCount: null,
            }
          : null,
      });
      return {
        id: workshop.id,
        name: workshop.name,
        teacherName: workshop.teacherName,
        status: workshop.status,
        activeTurnos: workshop.activeTurnos,
        enrollment: {
          open: readiness.complete,
          summary: readiness.summary,
          cta: readiness.next?.cta ?? null,
          href: readiness.next?.href ?? null,
        },
      };
    }),
  );
  return {
    filter: parseWorkshopFilterKey(estado),
    rows,
    feedback: feedbackCode(request, ["deleted"] as const),
  };
}

export default function AdminWorkshops() {
  const { filter, rows, feedback } = useLoaderData<typeof loader>();
  return <WorkshopsList rows={rows} filter={filter} feedback={feedback} />;
}
