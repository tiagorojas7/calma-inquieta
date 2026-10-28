import { data, redirect, useActionData, useLoaderData } from "react-router";
import { isUuid } from "~/app/admin/enrollment-ids";
import { failureResponse } from "~/app/admin/failure-response";
import {
  parseStatusEntries,
  parseTurnoRef,
  sheetView,
  turnoOptions,
} from "~/app/attendance/admin-view";
import { servicesContext } from "~/app/context";
import {
  AttendanceSheet,
  type MakeUpFeedback,
} from "~/app/ui/admin/attendance-sheet";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import type { AdminActor } from "~/modules/admin-access";
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
  const { attendance } = context.get(servicesContext);
  const [found, turnos] = await Promise.all([
    attendance.sheet(actor, periodId, turnoId, date),
    attendance.listTurnos(actor),
  ]);
  if (!found.ok) throw failureResponse(found.error);
  if (!turnos.ok) throw failureResponse(turnos.error);
  return {
    ...sheetView(found.value),
    makeUpTurnos: turnoOptions(turnos.value),
    saved: new URL(request.url).searchParams.get("guardado") === "1",
  };
}

function text(form: FormData, name: string): string {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

const makeUpErrors = copy.makeUp.errors;

async function scheduleMakeUp(
  actor: AdminActor,
  context: Route.ActionArgs["context"],
  form: FormData,
  session: { periodId: string; turnoId: string; date: string },
) {
  const values = {
    makeUpTurno: text(form, "makeUpTurno"),
    makeUpDate: text(form, "makeUpDate"),
  };
  const email = text(form, "email");
  const rejected = (feedback: Omit<MakeUpFeedback, "email" | "values">) =>
    data({ makeUp: { email, values, ...feedback } }, { status: 422 });
  const target = parseTurnoRef(values.makeUpTurno);
  if (target === null)
    return rejected({ errors: { makeUpTurno: makeUpErrors.makeUpTurno } });
  const planned = await context
    .get(servicesContext)
    .attendance.scheduleMakeUp(actor, {
      email,
      ...session,
      makeUpPeriodId: target.periodId,
      makeUpTurnoId: target.turnoId,
      makeUpDate: values.makeUpDate,
    });
  if (planned.ok)
    return redirect(
      `/admin/asistencia/${session.periodId}/${session.turnoId}/${session.date}`,
    );
  const error = planned.error;
  if (error.kind === "make-up-exists")
    return rejected({ errors: {}, formError: makeUpErrors.exists });
  if (error.kind === "invalid") {
    const errors: Record<string, string> = {};
    for (const issue of error.issues)
      errors[issue.field] ??= makeUpErrors[issue.field];
    return rejected({ errors });
  }
  throw failureResponse(error);
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const session = sheetParams(params);
  const form = await request.formData().catch(() => null);
  const intent = form === null ? "" : text(form, "intent");
  if (form === null || (intent !== "save" && intent !== "makeup"))
    throw data(null, { status: 400 });
  if (intent === "makeup") return scheduleMakeUp(actor, context, form, session);
  const saved = await context
    .get(servicesContext)
    .attendance.recordSession(
      actor,
      session.periodId,
      session.turnoId,
      session.date,
      parseStatusEntries(form),
    );
  if (saved.ok)
    return redirect(
      `/admin/asistencia/${session.periodId}/${session.turnoId}/${session.date}?guardado=1`,
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
      feedback={{
        saved: sheet.saved,
        error: rejected && "error" in rejected ? rejected.error : undefined,
        makeUp: rejected && "makeUp" in rejected ? rejected.makeUp : undefined,
      }}
    />
  );
}
