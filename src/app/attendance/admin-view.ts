import { isUuid } from "~/app/admin/enrollment-ids";
import { formatTimeRange, weekdayName } from "~/app/catalog/format";
import {
  dateLabel,
  dateTimeLabel,
  monthLabel,
} from "~/app/enrollment/order-labels";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import {
  sessionDates,
  weekdayOf,
  type MakeUpEntry,
  type ScheduledTurno,
  type SessionSheet,
  type TurnoSessions,
} from "~/modules/attendance";

const copy = adminMicrocopy.attendance;

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
    rows: rows.map((row) => ({
      email: row.email,
      name: row.name,
      orderNumber: row.orderNumber,
      feePaid: row.feePaid,
      status: row.status,
      makeUp: row.makeUp
        ? {
            status: row.makeUp.status,
            label: copy.makeUp[row.makeUp.status],
          }
        : null,
    })),
  };
}

/** Every turno as a `periodId:turnoId` choice for a make-up class. */
export function turnoOptions(turnos: readonly ScheduledTurno[]) {
  return turnos.map((turno) => ({
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
    doneNote:
      entry.status === "done" && entry.doneAt && entry.doneBy
        ? copy.makeUps.doneBy(entry.doneBy, dateTimeLabel(entry.doneAt))
        : null,
  };
}

/** Make-up classes split into the ones still to take and the ones taken. */
export function makeUpsView(entries: readonly MakeUpEntry[]) {
  return {
    pending: entries.filter((e) => e.status === "pending").map(makeUpRow),
    done: entries.filter((e) => e.status === "done").map(makeUpRow),
  };
}
