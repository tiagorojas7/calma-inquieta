import { data, useLoaderData } from "react-router";
import { isUuid } from "~/app/admin/enrollment-ids";
import { failureResponse } from "~/app/admin/failure-response";
import { sessionsView } from "~/app/attendance/admin-view";
import { servicesContext } from "~/app/context";
import { AttendanceSessions } from "~/app/ui/admin/attendance-screens";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/attendance-sessions";

export function meta() {
  return [{ title: "Clases | Asistencia | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.periodId) || !isUuid(params.turnoId))
    throw data(null, { status: 404 });
  const found = await context
    .get(servicesContext)
    .attendance.sessions(actor, params.periodId, params.turnoId);
  if (!found.ok) throw failureResponse(found.error);
  return sessionsView(found.value);
}

export default function AdminAttendanceSessions() {
  return <AttendanceSessions {...useLoaderData<typeof loader>()} />;
}
