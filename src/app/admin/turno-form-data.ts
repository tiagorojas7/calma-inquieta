import type { Turno, TurnoDraft, Weekday } from "~/modules/workshops";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The turno form's fields as trimmed text. Weekday, time range and capacity
 * are validated by the workshops service, whose issues the screen words.
 */
export function parseTurnoDraft(form: FormData): TurnoDraft {
  return {
    label: text(form, "label"),
    weekday: text(form, "weekday"),
    startsAt: text(form, "startsAt"),
    endsAt: text(form, "endsAt"),
    defaultCapacity: text(form, "defaultCapacity"),
  };
}

const INTENTS = ["save", "retire", "reactivate", "delete"] as const;
export type TurnoIntent = (typeof INTENTS)[number];

export function parseTurnoIntent(form: FormData): TurnoIntent | null {
  const intent = text(form, "intent");
  return INTENTS.find((known) => known === intent) ?? null;
}

/** The turno a post is about; empty when it adds a new one. */
export function parseTurnoId(form: FormData): string {
  return text(form, "turnoId");
}

/** The turno being edited, from `?editar=<id>`. */
export function parseEditingTurno(url: URL): string | null {
  return url.searchParams.get("editar") || null;
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

export const WEEKDAY_OPTIONS = WEEKDAY_NAMES.map((label, index) => ({
  value: String(index + 1),
  label,
}));

export function weekdayName(weekday: Weekday): string {
  return WEEKDAY_NAMES[weekday - 1] ?? "";
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${startsAt} a ${endsAt}`;
}

/** The stored turno as the strings the form shows. */
export function turnoFormValues(turno: Turno): TurnoDraft {
  return {
    label: turno.label,
    weekday: String(turno.weekday),
    startsAt: turno.startsAt,
    endsAt: turno.endsAt,
    defaultCapacity: String(turno.defaultCapacity),
  };
}
