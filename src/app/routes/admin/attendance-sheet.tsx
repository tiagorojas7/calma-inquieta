import { data, redirect, useActionData, useLoaderData } from "react-router";
import { isUuid } from "~/app/admin/enrollment-ids";
import { failureResponse } from "~/app/admin/failure-response";
import { parseStatusEntries, sheetView } from "~/app/attendance/admin-view";
import { servicesContext } from "~/app/context";
import { AttendanceSheet } from "~/app/ui/admin/attendance-sheet";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { isIsoDate } from "~/modules/attendance";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/attendance-sheet";

const copy = adminMicrocopy.attendance;

export function meta() {
  return [{ title: "Asistencia de la clase | Panel | Calma Inquieta" }];
}

function sheetParams(params: Route.LoaderArgs["params"]) {
  if (
    !isUuid(params.periodId) ||
    !isUuid(params.turnoId) ||
    !isIsoDate(params.date)
  )
    throw data(null, { status: 404 });
  return {
    periodId: params.periodId,
    turnoId: params.turnoId,
    date: params.date,
  };
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const { periodId, turnoId, date } = sheetParams(params);
  const found = await context
    .get(servicesContext)
    .attendance.sheet(actor, periodId, turnoId, date);
  if (!found.ok) throw failureResponse(found.error);
  return {
    ...sheetView(found.value),
    saved: new URL(request.url).searchParams.get("guardado") === "1",
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const { periodId, turnoId, date } = sheetParams(params);
  const form = await request.formData().catch(() => null);
  if (form === null || form.get("intent") !== "save")
    throw data(null, { status: 400 });
  const saved = await context
    .get(servicesContext)
    .attendance.recordSession(
      actor,
      periodId,
      turnoId,
      date,
      parseStatusEntries(form),
    );
  if (saved.ok)
    return redirect(
      `/admin/asistencia/${periodId}/${turnoId}/${date}?guardado=1`,
    );
  if (saved.error.kind === "invalid")
    return data({ error: copy.sheet.invalid }, { status: 422 });
  throw failureResponse(saved.error);
}

export default function AdminAttendanceSheet() {
  const sheet = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <AttendanceSheet
      {...sheet}
      feedback={{ saved: sheet.saved, error: rejected?.error }}
    />
  );
}
