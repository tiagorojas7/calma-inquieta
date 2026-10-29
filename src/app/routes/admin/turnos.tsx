import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  TURNO_FIELD_MESSAGES,
  turnoRulesMessage,
} from "~/app/admin/issue-messages";
import {
  invalidTurnoResponse,
  turnoRefusedResponse,
} from "~/app/admin/turno-action-data";
import {
  WEEKDAY_OPTIONS,
  formatTimeRange,
  parseEditingTurno,
  parseTurnoDraft,
  parseTurnoId,
  parseTurnoIntent,
  turnoFormValues,
  weekdayName,
} from "~/app/admin/turno-form-data";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { monthName } from "~/app/admin/workshop-readiness";
import { cordobaMonthOf } from "~/modules/workshops";
import { TurnosScreen } from "~/app/ui/admin/turnos-screen";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/turnos";

const NO_VALUES = {
  label: "",
  weekday: "1",
  startsAt: "",
  endsAt: "",
  defaultCapacity: "",
};

export function meta() {
  return [{ title: "Turnos | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const found = await context
    .get(servicesContext)
    .monthlyWorkshops.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  const workshop = found.value;
  const editingId = parseEditingTurno(new URL(request.url));
  const editing =
    editingId === null
      ? null
      : (workshop.turnos.find((turno) => turno.id === editingId) ?? null);
  if (editingId !== null && editing === null)
    throw failureResponse({ kind: "not-found" });
  return {
    feedback: feedbackCode(request, [
      "added",
      "updated",
      "retired",
      "reactivated",
      "deleted",
    ] as const),
    monthName: monthName(cordobaMonthOf(new Date())),
    workshopId: workshop.id,
    workshopName: workshop.name,
    turnos: workshop.turnos.map((turno) => ({
      id: turno.id,
      label: turno.label,
      day: weekdayName(turno.weekday),
      range: formatTimeRange(turno.startsAt, turno.endsAt),
      capacity: turno.defaultCapacity,
      active: turno.active,
      usedByPeriods: turno.usedByPeriods,
    })),
    editing: editing
      ? { turnoId: editing.id, values: turnoFormValues(editing) }
      : null,
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const workshops = context.get(servicesContext).monthlyWorkshops;
  const form = await request.formData();
  const intent = parseTurnoIntent(form);
  if (intent === null) throw data(null, { status: 400 });
  const here = `/admin/talleres/${params.id}/turnos`;
  const turnoId = parseTurnoId(form);

  if (intent === "save") {
    const draft = parseTurnoDraft(form);
    const saved =
      turnoId === ""
        ? await workshops.addTurno(actor, params.id, draft)
        : await workshops.updateTurno(actor, params.id, turnoId, draft);
    if (saved.ok)
      return redirect(withFeedback(here, turnoId === "" ? "added" : "updated"));
    if (saved.error.kind === "invalid")
      return invalidTurnoResponse(draft, turnoId, saved.error.issues);
    throw failureResponse(saved.error);
  }

  if (turnoId === "") throw data(null, { status: 400 });

  if (intent === "reactivate") {
    const changed = await workshops.reactivateTurno(actor, params.id, turnoId);
    if (changed.ok) return redirect(withFeedback(here, "reactivated"));
    if (changed.error.kind === "label-conflict")
      return turnoRefusedResponse(TURNO_FIELD_MESSAGES.label.duplicate);
    throw failureResponse(changed.error);
  }

  const changed =
    intent === "retire"
      ? await workshops.retireTurno(actor, params.id, turnoId)
      : await workshops.deleteTurno(actor, params.id, turnoId);
  if (changed.ok)
    return redirect(
      withFeedback(here, intent === "retire" ? "retired" : "deleted"),
    );
  if (changed.error.kind === "rules-unmet")
    return turnoRefusedResponse(turnoRulesMessage(changed.error.rules));
  throw failureResponse(changed.error);
}

export default function AdminTurnos() {
  const screen = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const formRejected = rejected && "values" in rejected ? rejected : null;
  const listError =
    rejected && "listError" in rejected ? rejected.listError : undefined;
  const workshopHref = `/admin/talleres/${screen.workshopId}`;
  return (
    <TurnosScreen
      workshopName={screen.workshopName}
      workshopHref={workshopHref}
      turnosHref={`${workshopHref}/turnos`}
      turnos={screen.turnos}
      form={{
        turnoId: formRejected?.turnoId ?? screen.editing?.turnoId ?? "",
        values: formRejected?.values ?? screen.editing?.values ?? NO_VALUES,
        errors: formRejected?.errors ?? {},
        formError: formRejected?.formError,
        weekdays: WEEKDAY_OPTIONS,
      }}
      listError={listError}
      feedback={screen.feedback}
      nextMonth={screen.monthName}
    />
  );
}
