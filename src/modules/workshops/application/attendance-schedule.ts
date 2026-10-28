import type { MonthlyWorkshopRepository } from "./monthly-workshop-repository";
import type { WorkshopPeriodRepository } from "./workshop-period-repository";

/** One turno of a non-draft period, as attendance consumers need it. */
export interface WorkshopScheduleTurno {
  readonly periodId: string;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly turnoId: string;
  readonly turnoLabel: string;
  readonly weekday: number;
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface WorkshopScheduleLookup {
  listScheduledTurnos(): Promise<readonly WorkshopScheduleTurno[]>;
}

export interface WorkshopScheduleLookupDeps {
  readonly workshops: Pick<MonthlyWorkshopRepository, "list">;
  readonly periods: Pick<WorkshopPeriodRepository, "listForWorkshop">;
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Actorless read of every turno of an open or closed period (past months
 * stay reachable so late attendance can still be recorded). Newest month
 * first, then workshop name, weekday and start time.
 */
export function createWorkshopScheduleLookup(
  deps: WorkshopScheduleLookupDeps,
): WorkshopScheduleLookup {
  return {
    async listScheduledTurnos() {
      const workshops = await deps.workshops.list([
        "draft",
        "published",
        "paused",
        "archived",
      ]);
      const perWorkshop = await Promise.all(
        workshops.map(async (workshop) =>
          (await deps.periods.listForWorkshop(workshop.id))
            .filter((period) => period.status !== "draft")
            .flatMap((period) =>
              period.turnos.map((turno) => ({
                periodId: period.id,
                workshopId: workshop.id,
                workshopName: workshop.name,
                period: period.period,
                turnoId: turno.turnoId,
                turnoLabel: turno.label,
                weekday: turno.weekday,
                startsAt: turno.startsAt,
                endsAt: turno.endsAt,
              })),
            ),
        ),
      );
      return perWorkshop
        .flat()
        .sort(
          (a, b) =>
            compare(b.period, a.period) ||
            compare(a.workshopName, b.workshopName) ||
            a.weekday - b.weekday ||
            compare(a.startsAt, b.startsAt) ||
            compare(a.turnoId, b.turnoId),
        );
    },
  };
}
