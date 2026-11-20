import type { AppServices } from "~/composition/request-services";
import type { AdminActor } from "~/modules/admin-access";
import { openableMonth } from "./next-month";

export interface OpenMonthTask {
  readonly workshopId: string;
  readonly workshopName: string;
  /** `YYYY-MM`, the month "Abrir <mes>" opens. */
  readonly period: string;
}

/**
 * Hoy's "Abrir <mes>" tasks. Eligibility is the same rule Clases and the
 * talleres list use (`openableMonth`); Hoy only keeps the months up to
 * `horizon`, so it does not nag about months far ahead. A read that cannot be
 * answered must not hide the rest of the day, so any failure yields no task.
 */
export async function loadOpenMonthTasks(
  services: Pick<AppServices, "monthlyWorkshops" | "workshopPeriods">,
  actor: AdminActor,
  horizon: string,
): Promise<readonly OpenMonthTask[]> {
  try {
    const workshops = await services.monthlyWorkshops.list(actor, {
      status: "published",
    });
    if (!workshops.ok) return [];
    const perWorkshop = await Promise.all(
      workshops.value.map(async (workshop): Promise<OpenMonthTask[]> => {
        const periods = await services.workshopPeriods.list(actor, workshop.id);
        if (!periods.ok) return [];
        const month = openableMonth({
          workshopStatus: workshop.status,
          periods: periods.value.periods,
          suggestedNext: periods.value.suggestedNext,
        });
        return month !== null && month.period <= horizon
          ? [
              {
                workshopId: workshop.id,
                workshopName: workshop.name,
                period: month.period,
              },
            ]
          : [];
      }),
    );
    return perWorkshop.flat();
  } catch {
    return [];
  }
}
