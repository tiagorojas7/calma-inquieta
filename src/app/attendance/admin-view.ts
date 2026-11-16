import { isUuid } from "~/app/admin/enrollment-ids";
import { formatTimeRange, weekdayName } from "~/app/catalog/format";
import {
  dateLabel,
  dateTimeLabel,
  monthLabel,
} from "~/app/enrollment/order-labels";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { attendanceRulesCopy } from "./copy";
import {
  sessionDates,
  weekdayOf,
  type MakeUpEntry,
  type MakeUpStatus,
  type ScheduledTurno,
  type SessionSheet,
  type TurnoSessions,
} from "~/modules/attendance";

const copy = adminMicrocopy.attendance;

const makeUpLabels: Record<MakeUpStatus, string> = {
  pending: copy.makeUp.pending,
  done: copy.makeUp.done,
  missed: attendanceRulesCopy.makeUpMissed.label,
};

export interface AttendanceFilter {
  readonly mes: string;
  readonly taller: string;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** `?mes=` and `?taller=` kept only when some turno has them. */
export function parseAttendanceFilter(
  params: URLSearchParams,
  turnos: readonly ScheduledTurno[],
): AttendanceFilter {
  const months = turnos
    .map((turno) => turno.period)
    .sort()
    .reverse();
  const mes = params.get("mes") ?? "";
  const taller = params.get("taller") ?? "";
  return {
    mes: MONTH.test(mes) && months.includes(mes) ? mes : (months[0] ?? ""),
    taller: turnos.some((turno) => turno.workshopId === taller) ? taller : "",
  };
}

function scheduleOf(turno: ScheduledTurno): string {
  return `${weekdayName(turno.weekday)} ${formatTimeRange(turno.startsAt, turno.endsAt)}`;
}

function sessionDateLabel(date: string): string {
  return `${weekdayName(weekdayOf(date))} ${dateLabel(date)}`;
}

const sessionsPath = (periodId: string, turnoId: string) =>
  `/admin/asistencia/${periodId}/${turnoId}`;

export function attendanceIndexView(
  turnos: readonly ScheduledTurno[],
  filter: AttendanceFilter,
) {
  const months = [...new Set(turnos.map((turno) => turno.period))]
    .sort()
    .reverse()
    .map((value) => ({ value, label: monthLabel(value) }));
  const workshops = [
    ...new Map(
      turnos.map((turno) => [turno.workshopId, turno.workshopName]),
    ).entries(),
  ]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const rows = turnos
    .filter(
      (turno) =>
        turno.period === filter.mes &&
        (filter.taller === "" || turno.workshopId === filter.taller),
    )
    .map((turno) => ({
      key: `${turno.periodId}:${turno.turnoId}`,
      href: sessionsPath(turno.periodId, turno.turnoId),
      workshop: turno.workshopName,
      turno: turno.turnoLabel,
      schedule: scheduleOf(turno),
      sessions: sessionDates(turno.period, turno.weekday).length,
    }));
  return { filter, months, workshops, rows };
}

export function sessionsView({ turno, sessions }: TurnoSessions) {
  return {
    heading: `${turno.workshopName}, ${turno.turnoLabel}`,
    subtitle: `${monthLabel(turno.period)} · ${scheduleOf(turno)}`,
    rows: sessions.map((session) => ({
      key: session.date,
      href: `${sessionsPath(turno.periodId, turno.turnoId)}/${session.date}`,
      date: sessionDateLabel(session.date),
      marked: String(session.marked),
      present: String(session.present),
      absent: String(session.absent),
    })),
  };
}

export function sheetView({ turno, date, rows }: SessionSheet) {
  return {
    heading: sessionDateLabel(date),
    subtitle: `${turno.workshopName}, ${turno.turnoLabel} · ${monthLabel(turno.period)}`,
    backHref: sessionsPath(turno.periodId, turno.turnoId),
    pendingNote: attendanceRulesCopy.pendingNote,
    makeUpFullWarning: attendanceRulesCopy.makeUpFullWarning,
    rows: rows.map((row) => ({
      email: row.email,
      name: row.name,
      orderNumber: row.orderNumber,
      feePaid: row.feePaid,
      status: row.status,
      makeUp: row.makeUp
        ? {
            status: row.makeUp.status,
            label: makeUpLabels[row.makeUp.status],
          }
        : null,
    })),
  };
}

/**
 * The turnos a make-up class can go to, as `periodId:turnoId` choices: other
 * turnos of the absent student's own workshop, never the turno itself.
 */
export function turnoOptions(
  turnos: readonly ScheduledTurno[],
  own: Pick<ScheduledTurno, "workshopId" | "turnoId">,
) {
  return turnos
    .filter(
      (turno) =>
        turno.workshopId === own.workshopId && turno.turnoId !== own.turnoId,
    )
    .map((turno) => ({
      value: `${turno.periodId}:${turno.turnoId}`,
      label: `${turno.workshopName}, ${turno.turnoLabel} (${monthLabel(turno.period)})`,
    }));
}

export function parseTurnoRef(
  value: string,
): { periodId: string; turnoId: string } | null {
  const [periodId = "", turnoId = "", ...rest] = value.split(":");
  return rest.length === 0 && isUuid(periodId) && isUuid(turnoId)
    ? { periodId, turnoId }
    : null;
}

const STATUS_FIELD = "status:";

/** One `status:<email>` field per marked student; unmarked ones send nothing. */
export function parseStatusEntries(
  form: FormData,
): { email: string; status: string }[] {
  const entries: { email: string; status: string }[] = [];
  for (const [name, value] of form.entries()) {
    if (name.startsWith(STATUS_FIELD) && typeof value === "string" && value)
      entries.push({ email: name.slice(STATUS_FIELD.length), status: value });
  }
  return entries;
}

function makeUpRow(entry: MakeUpEntry) {
  return {
    id: entry.id,
    student: entry.studentName,
    email: entry.email,
    absence: `${entry.workshopName}, ${entry.turnoLabel} · ${sessionDateLabel(entry.date)}`,
    makeUp: `${entry.makeUpWorkshopName}, ${entry.makeUpTurnoLabel} · ${sessionDateLabel(entry.makeUpDate)}`,
    doneNote: closingNote(entry),
  };
}

/** Who closed the make-up and when; `null` while it is pending. */
function closingNote(entry: MakeUpEntry): string | null {
  if (!entry.doneAt || !entry.doneBy) return null;
  const at = dateTimeLabel(entry.doneAt);
  if (entry.status === "done") return copy.makeUps.doneBy(entry.doneBy, at);
  if (entry.status === "missed")
    return attendanceRulesCopy.makeUpMissed.note(entry.doneBy, at);
  return null;
}

/** Make-up classes split into the ones still to take, taken and missed. */
export function makeUpsView(entries: readonly MakeUpEntry[]) {
  const ofStatus = (status: MakeUpStatus) =>
    entries.filter((e) => e.status === status).map(makeUpRow);
  return {
    pending: ofStatus("pending"),
    done: ofStatus("done"),
    missed: ofStatus("missed"),
    missedText: {
      title: attendanceRulesCopy.makeUpMissed.title,
      action: attendanceRulesCopy.makeUpMissed.action,
      actionPrefix: attendanceRulesCopy.makeUpMissed.actionPrefix,
      marked: attendanceRulesCopy.makeUpMissed.marked,
      closed: attendanceRulesCopy.makeUpMissed.closed,
    },
  };
}
