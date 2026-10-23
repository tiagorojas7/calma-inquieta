import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  parseIntensiveFilter,
  parseIntensiveFilterKey,
} from "~/app/admin/intensive-form-data";
import { IntensivesList } from "~/app/ui/admin/intensives-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/intensives";

export function meta() {
  return [{ title: "Intensivos | Panel | Calma Inquieta" }];
}

function formatDateTime(eventDate: string, startsAt: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(`${eventDate}T${startsAt}:00-03:00`));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const estado = new URL(request.url).searchParams.get("estado");
  const listed = await context
    .get(servicesContext)
    .intensives.list(actor, { status: parseIntensiveFilter(estado) });
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    filter: parseIntensiveFilterKey(estado),
    rows: listed.value.map((intensive) => ({
      id: intensive.id,
      name: intensive.name,
      teacherName: intensive.assignment?.teacher.name ?? null,
      status: intensive.status,
      dateTime: formatDateTime(intensive.eventDate, intensive.startsAt),
      capacity: intensive.capacity,
    })),
  };
}

export default function AdminIntensives() {
  const { filter, rows } = useLoaderData<typeof loader>();
  return <IntensivesList filter={filter} rows={rows} />;
}
