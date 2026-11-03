import type { AppServices } from "~/composition/request-services";
import type { AdminActor } from "~/modules/admin-access";
import { monthName } from "./workshop-readiness";

export interface EmptyOpenMonth {
  readonly id: string;
  readonly period: string;
  /** Capitalized month name, ready to start a sentence. */
  readonly label: string;
}

/**
 * Open months from `currentMonth` on that hold no active turno: they accept
 * enrollments on paper but nobody can book, so the owner must fix them. Past
 * months are history and never reported.
 */
export function emptyOpenMonths(
  periods: readonly {
    readonly id: string;
    readonly period: string;
    readonly status: "draft" | "open" | "closed";
    readonly activeTurnos: number;
  }[],
  currentMonth: string,
): readonly EmptyOpenMonth[] {
  return periods
    .filter(
      (item) =>
        item.status === "open" &&
        item.activeTurnos === 0 &&
        item.period >= currentMonth,
    )
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .map((item) => {
      const name = monthName(item.period);
      return {
        id: item.id,
        period: item.period,
        label: name.charAt(0).toUpperCase() + name.slice(1),
      };
    });
}

export interface EmptyMonthTask {
  readonly periodId: string;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly month: string;
}

/**
 * The home's "agregá un turno" tasks. A read that cannot be answered must not
 * hide the rest of the day, so any failure yields no task.
 */
export async function loadEmptyMonthTasks(
  services: Pick<AppServices, "monthlyWorkshops" | "workshopPeriods">,
  actor: AdminActor,
  currentMonth: string,
): Promise<readonly EmptyMonthTask[]> {
  try {
    const workshops = await services.monthlyWorkshops.list(actor, {
      status: "published",
    });
    if (!workshops.ok) return [];
    const perWorkshop = await Promise.all(
      workshops.value.map(async (workshop) => {
        const periods = await services.workshopPeriods.list(actor, workshop.id);
        if (!periods.ok) return [];
        return emptyOpenMonths(periods.value.periods, currentMonth).map(
          (month) => ({
            periodId: month.id,
            workshopId: workshop.id,
            workshopName: workshop.name,
            month: month.label,
          }),
        );
      }),
    );
    return perWorkshop.flat();
  } catch {
    return [];
  }
}
