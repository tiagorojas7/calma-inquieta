import type { Money } from "~/modules/_shared";

/**
 * Catalog display formatting. Pure and table-driven: no `Intl` for numbers or
 * names, so the output is byte-identical in Node tests and in workerd, and
 * dates are computed from the `YYYY-MM-DD` string, never from a local zone.
 */

const NO_BREAK_SPACE = " ";

const WEEKDAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;
const WEEKDAY_ABBREVIATIONS = [
  "lun",
  "mar",
  "mié",
  "jue",
  "vie",
  "sáb",
  "dom",
] as const;
const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;
const MONTH_ABBREVIATIONS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

const UNIT_WORDS = ["hora", "horas", "h", "min", "a", "de"] as const;

/** Every locale string the formatters emit, exported for the copy scan. */
export const CATALOG_FORMAT_TEXT = {
  weekdayNames: WEEKDAY_NAMES,
  weekdayAbbreviations: WEEKDAY_ABBREVIATIONS,
  monthNames: MONTH_NAMES,
  monthAbbreviations: MONTH_ABBREVIATIONS,
  unitWords: UNIT_WORDS,
} as const;

const CENTAVOS_PER_PESO = 100;
const MINUTES_PER_HOUR = 60;

function groupThousands(value: number): string {
  return String(value).replaceAll(/\B(?=(\d{3})+(?!\d))/gu, ".");
}

/** "$ 58.000" with U+00A0 after `$`; ",dd" only for non-zero centavos. */
export function formatPesos(money: Money): string {
  const centavos = money.toCentavos();
  const sign = centavos < 0 ? "-" : "";
  const absolute = Math.abs(centavos);
  const whole = Math.floor(absolute / CENTAVOS_PER_PESO);
  const cents = absolute % CENTAVOS_PER_PESO;
  const suffix = cents === 0 ? "" : `,${String(cents).padStart(2, "0")}`;
  return `${sign}$${NO_BREAK_SPACE}${groupThousands(whole)}${suffix}`;
}

/** A stored time may carry seconds ("14:00:00"); people read "14:00". */
function hourAndMinute(time: string): string {
  return time.slice(0, 5);
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${hourAndMinute(startsAt)} a ${hourAndMinute(endsAt)} h`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = String(minutes % MINUTES_PER_HOUR);
  if (hours === 0) {
    return `${rest} min`;
  }
  if (rest === "0") {
    return hours === 1 ? "1 hora" : `${String(hours)} horas`;
  }
  return `${String(hours)} h ${rest} min`;
}

/** `day` is 1..7 from Monday. */
export function weekdayName(day: number): string {
  return WEEKDAY_NAMES[day - 1] ?? "";
}

interface CivilDate {
  readonly year: string;
  readonly day: string;
  readonly monthIndex: number;
  /** 0 = Monday ... 6 = Sunday */
  readonly weekdayIndex: number;
}

const MONTH_OFFSETS = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;

function parseCivilDate(date: string): CivilDate {
  const [yearText = "", monthText = "", dayText = ""] = date.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  // Sakamoto's algorithm gives 0 = Sunday; shift it so that 0 = Monday.
  const shiftedYear = monthIndex < 2 ? year - 1 : year;
  const sundayFirst =
    (shiftedYear +
      Math.floor(shiftedYear / 4) -
      Math.floor(shiftedYear / 100) +
      Math.floor(shiftedYear / 400) +
      (MONTH_OFFSETS[monthIndex] ?? 0) +
      day) %
    7;
  return {
    year: String(year),
    day: String(day),
    monthIndex,
    weekdayIndex: (sundayFirst + 6) % 7,
  };
}

/** "Sábado 14 de noviembre" */
export function formatEventDate(date: string): string {
  const { day, monthIndex, weekdayIndex } = parseCivilDate(date);
  const weekday = WEEKDAY_NAMES[weekdayIndex] ?? "";
  const month = MONTH_NAMES[monthIndex] ?? "";
  return `${weekday} ${day} de ${month}`;
}

export interface DateBadgeParts {
  readonly dateTime: string;
  readonly weekday: string;
  readonly day: string;
  readonly month: string;
  readonly label: string;
}

export function dateBadgeParts(date: string): DateBadgeParts {
  const { year, day, monthIndex, weekdayIndex } = parseCivilDate(date);
  const weekday = (WEEKDAY_NAMES[weekdayIndex] ?? "").toLowerCase();
  const monthName = MONTH_NAMES[monthIndex] ?? "";
  return {
    dateTime: date,
    weekday: WEEKDAY_ABBREVIATIONS[weekdayIndex] ?? "",
    day,
    month: MONTH_ABBREVIATIONS[monthIndex] ?? "",
    label: `${weekday} ${day} de ${monthName} de ${year}`,
  };
}
