import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Result,
} from "~/modules/_shared";

export type TurnoCoreField =
  "label" | "weekday" | "timeRange" | "defaultCapacity";
/** The typed label is ignored: the stored label is generated from the schedule. */
export type TurnoCoreDraft = {
  readonly label?: string;
  readonly weekday: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly defaultCapacity: string;
};
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TURNO_LIMITS = {
  capacity: { min: 1, max: 500 },
} as const;
export interface TurnoCore {
  readonly label: string;
  readonly labelKey: string;
  readonly weekday: Weekday;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly defaultCapacity: number;
}
const WEEKDAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

/** The one way a turno reads everywhere, for example "Martes 18:00 a 20:00". */
export function turnoDisplayName(
  weekday: Weekday,
  startsAt: string,
  endsAt: string,
): string {
  return `${WEEKDAY_NAMES[weekday - 1] ?? ""} ${startsAt} a ${endsAt}`;
}
export function turnoLabelKey(label: string): string {
  return label.normalize("NFC").toLocaleLowerCase("es");
}
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function validateTurnoCore(
  draft: TurnoCoreDraft,
): Result<TurnoCore, Invalid<TurnoCoreField>> {
  const issues: FieldIssue<TurnoCoreField>[] = [];
  const weekday = Number(draft.weekday);
  if (!/^\d+$/.test(draft.weekday.trim()) || weekday < 1 || weekday > 7)
    issues.push({
      field: "weekday",
      code: /^\d+$/.test(draft.weekday.trim())
        ? "out-of-range"
        : "invalid-format",
    });
  if (!TIME.test(draft.startsAt) || !TIME.test(draft.endsAt))
    issues.push({ field: "timeRange", code: "invalid-format" });
  else if (draft.endsAt <= draft.startsAt)
    issues.push({ field: "timeRange", code: "end-before-start" });
  const capacity = Number(draft.defaultCapacity);
  if (!/^\d+$/.test(draft.defaultCapacity.trim()))
    issues.push({ field: "defaultCapacity", code: "invalid-format" });
  else if (
    capacity < TURNO_LIMITS.capacity.min ||
    capacity > TURNO_LIMITS.capacity.max
  )
    issues.push({ field: "defaultCapacity", code: "out-of-range" });
  if (issues.length) return err({ kind: "invalid", issues });
  const label = turnoDisplayName(
    weekday as Weekday,
    draft.startsAt,
    draft.endsAt,
  );
  return ok({
    label,
    labelKey: turnoLabelKey(label),
    weekday: weekday as Weekday,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    defaultCapacity: capacity,
  });
}
export function compareTurnos(
  a: {
    readonly weekday: Weekday;
    readonly startsAt: string;
    readonly id: string;
  },
  b: {
    readonly weekday: Weekday;
    readonly startsAt: string;
    readonly id: string;
  },
): number {
  return (
    a.weekday - b.weekday ||
    (a.startsAt < b.startsAt
      ? -1
      : a.startsAt > b.startsAt
        ? 1
        : a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0)
  );
}
