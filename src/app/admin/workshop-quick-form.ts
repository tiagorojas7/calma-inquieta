import type {
  MonthlyWorkshopDraft,
  TurnoDraft,
  Weekday,
} from "~/modules/workshops";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { weekdayName } from "./turno-form-data";

const copy = adminMicrocopy.workshops.quick;

/** Turno rows the one-page form offers; only the filled ones count. */
export const QUICK_TURNO_ROWS = 5;
/** Rows shown before "+ otro turno" opens the rest. */
export const QUICK_VISIBLE_ROWS = 3;

const SUMMARY_LIMIT = 200;
/** The domain requires a technique; a quick taller gets this neutral one. */
export const DEFAULT_TECHNIQUE = "Taller";

export interface QuickTurnoRow {
  readonly weekday: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly capacity: string;
}

/** What the one-page form shows, typed or saved. */
export interface QuickValues {
  readonly name: string;
  readonly description: string;
  readonly teacherId: string;
  readonly defaultFee: string;
  readonly percentage: string;
  readonly rows: readonly QuickTurnoRow[];
  readonly materialIds: readonly string[];
}

export type QuickIntent = "publish" | "draft";

export interface QuickWorkshopInput {
  readonly intent: QuickIntent;
  readonly draft: MonthlyWorkshopDraft;
  /** Filled rows only, with the form row they came from. */
  readonly turnos: readonly { index: number; draft: TurnoDraft }[];
  /** Message per form row that cannot be saved. */
  readonly turnoErrors: Readonly<Record<number, string>>;
  readonly materialIds: readonly string[];
  readonly values: QuickValues;
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function column(form: FormData, key: string): string[] {
  return Array.from({ length: QUICK_TURNO_ROWS }, (_, index) => {
    const value = form.getAll(key)[index];
    return typeof value === "string" ? value.trim() : "";
  });
}

/** One short line for the site cards, cut at a word within 200 characters. */
export function deriveSummary(description: string): string {
  const flat = description.replace(/\s+/g, " ").trim();
  if (flat.length <= SUMMARY_LIMIT) return flat;
  const cut = flat.slice(0, SUMMARY_LIMIT - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function rowProblem(row: QuickTurnoRow): string | null {
  const weekday = Number(row.weekday);
  const capacity = Number(row.capacity);
  const valid =
    /^[1-7]$/.test(row.weekday) &&
    weekday >= 1 &&
    TIME.test(row.startsAt) &&
    TIME.test(row.endsAt) &&
    row.endsAt > row.startsAt &&
    /^\d+$/.test(row.capacity) &&
    capacity >= 1 &&
    capacity <= 500;
  return valid ? null : copy.rowInvalid;
}

const isBlank = (row: QuickTurnoRow) =>
  !row.weekday && !row.startsAt && !row.endsAt && !row.capacity;

/**
 * The one-page taller form as a draft plus its turnos. The slug is left empty
 * so the flow derives a unique one; the summary comes from the description
 * and the technique falls back to a neutral word, so neither is asked. Rows
 * that are completely empty are ignored; a half-filled row is reported before
 * anything is saved.
 */
export function parseQuickWorkshop(form: FormData): QuickWorkshopInput {
  const weekdays = column(form, "turnoWeekday");
  const starts = column(form, "turnoStartsAt");
  const ends = column(form, "turnoEndsAt");
  const capacities = column(form, "turnoCapacity");
  const rows: QuickTurnoRow[] = weekdays.map((weekday, index) => ({
    weekday,
    startsAt: starts[index] ?? "",
    endsAt: ends[index] ?? "",
    capacity: capacities[index] ?? "",
  }));
  const turnos: { index: number; draft: TurnoDraft }[] = [];
  const turnoErrors: Record<number, string> = {};
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (isBlank(row)) return;
    const problem = rowProblem(row);
    if (problem) {
      turnoErrors[index] = problem;
      return;
    }
    const key = `${row.weekday}|${row.startsAt}`;
    if (seen.has(key)) {
      turnoErrors[index] = copy.rowDuplicate;
      return;
    }
    seen.add(key);
    turnos.push({
      index,
      draft: {
        label: `${weekdayName(Number(row.weekday) as Weekday)} ${row.startsAt}`,
        weekday: row.weekday,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        defaultCapacity: row.capacity,
      },
    });
  });
  const description = text(form, "description");
  const materialIds = form
    .getAll("materialIds")
    .filter((id): id is string => typeof id === "string" && id !== "");
  const intent = text(form, "intent") === "publish" ? "publish" : "draft";
  const values: QuickValues = {
    name: text(form, "name"),
    description,
    teacherId: text(form, "teacherId"),
    defaultFee: text(form, "defaultFee"),
    percentage: text(form, "percentage"),
    rows,
    materialIds,
  };
  return {
    intent,
    draft: {
      name: values.name,
      slug: "",
      summary: text(form, "summary") || deriveSummary(description),
      description,
      technique: text(form, "technique") || DEFAULT_TECHNIQUE,
      defaultFee: values.defaultFee,
      teacherId: values.teacherId,
      percentage: values.percentage,
      images: [],
      confirmSlugChange: false,
    },
    turnos,
    turnoErrors,
    materialIds,
    values,
  };
}
