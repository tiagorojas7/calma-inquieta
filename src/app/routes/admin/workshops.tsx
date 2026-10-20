import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  parseWorkshopFilter,
  parseWorkshopFilterKey,
} from "~/app/admin/workshop-form-data";
import { WorkshopsList } from "~/app/ui/admin/workshops-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshops";

export function meta() {
  return [{ title: "Talleres | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const estado = new URL(request.url).searchParams.get("estado");
  const listed = await context
    .get(servicesContext)
    .monthlyWorkshops.list(actor, { status: parseWorkshopFilter(estado) });
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    filter: parseWorkshopFilterKey(estado),
    rows: listed.value.map((workshop) => ({
      id: workshop.id,
      name: workshop.name,
      teacherName: workshop.teacherName,
      status: workshop.status,
      activeTurnos: workshop.activeTurnos,
    })),
  };
}

export default function AdminWorkshops() {
  const { filter, rows } = useLoaderData<typeof loader>();
  return <WorkshopsList rows={rows} filter={filter} />;
}
