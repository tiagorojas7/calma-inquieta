import { useLoaderData } from "react-router";
import { failureResponse } from "~/app/admin/failure-response";
import { servicesContext } from "~/app/context";
import { formatWholePesos } from "~/app/admin/workshop-form-data";
import { WorkshopPeriodsList } from "~/app/ui/admin/workshop-periods-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshop-periods";

const LIST = "/admin/talleres";

export function meta() {
  return [{ title: "Períodos | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const workshop = await services.monthlyWorkshops.get(actor, params.id);
  if (!workshop.ok) throw failureResponse(workshop.error);
  const listed = await services.workshopPeriods.list(actor, params.id);
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    workshopId: workshop.value.id,
    workshopName: workshop.value.name,
    periods: listed.value.periods.map((period) => ({
      id: period.id,
      period: period.period,
      status: period.status,
      fee: formatWholePesos(period.fee),
      totalCapacity: period.totalCapacity,
    })),
  };
}

export default function AdminWorkshopPeriods() {
  const screen = useLoaderData<typeof loader>();
  return (
    <WorkshopPeriodsList
      workshopName={screen.workshopName}
      workshopHref={`${LIST}/${screen.workshopId}`}
      rows={screen.periods}
    />
  );
}
