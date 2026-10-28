import { useLoaderData } from "react-router";
import { failureResponse } from "~/app/admin/failure-response";
import {
  attendanceIndexView,
  parseAttendanceFilter,
} from "~/app/attendance/admin-view";
import { servicesContext } from "~/app/context";
import { AttendanceIndex } from "~/app/ui/admin/attendance-screens";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/attendance";

export function meta() {
  return [{ title: "Asistencia | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const listed = await context
    .get(servicesContext)
    .attendance.listTurnos(actor);
  if (!listed.ok) throw failureResponse(listed.error);
  const filter = parseAttendanceFilter(
    new URL(request.url).searchParams,
    listed.value,
  );
  return attendanceIndexView(listed.value, filter);
}

export default function AdminAttendance() {
  return <AttendanceIndex {...useLoaderData<typeof loader>()} />;
}
