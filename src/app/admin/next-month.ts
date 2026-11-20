import { monthName } from "./workshop-readiness";

export interface OpenableMonth {
  readonly period: string;
  /** Lowercase month name, as in "Abrir diciembre". */
  readonly label: string;
}

/**
 * The one rule for "Abrir <mes>", used by Hoy, Clases and the talleres list.
 * Only a published taller can open a month, and only the one the periods list
 * suggests (the month after its latest one, never earlier than this month),
 * and not while its latest month is still a draft that needs publishing first.
 */
export function openableMonth(input: {
  readonly workshopStatus: string;
  readonly periods: readonly {
    readonly period: string;
    readonly status: string;
  }[];
  readonly suggestedNext: string | null;
}): OpenableMonth | null {
  const { workshopStatus, periods, suggestedNext } = input;
  if (workshopStatus !== "published" || suggestedNext === null) return null;
  const latest = periods.reduce<(typeof periods)[number] | null>(
    (best, item) => (best && best.period > item.period ? best : item),
    null,
  );
  if (latest !== null && latest.status === "draft") return null;
  if (periods.some((item) => item.period === suggestedNext)) return null;
  return { period: suggestedNext, label: monthName(suggestedNext) };
}
