import type { Clock } from "~/modules/_shared";
import type { MonthlyWorkshopRepository } from "./monthly-workshop-repository";
import type { WorkshopPeriodRepository } from "./workshop-period-repository";
import {
  cordobaMonthOf,
  parsePeriodKey,
  type WorkshopEnrollmentOffer,
  type WorkshopEnrollmentOfferLookup,
  type WorkshopEnrollmentOfferQuery,
} from "./contracts";

export interface WorkshopEnrollmentOfferLookupDeps {
  readonly workshops: Pick<MonthlyWorkshopRepository, "findBySlug">;
  readonly periods: Pick<WorkshopPeriodRepository, "findByWorkshopPeriod">;
  readonly clock: Clock;
}

/**
 * Actorless public read limited to offers that can accept a monthly enrollment.
 * Administrative services remain actor-first and are not reused at this boundary.
 */
export function createWorkshopEnrollmentOfferLookup(
  deps: WorkshopEnrollmentOfferLookupDeps,
): WorkshopEnrollmentOfferLookup {
  return {
    async findEnrollmentOffer(
      query: WorkshopEnrollmentOfferQuery,
    ): Promise<WorkshopEnrollmentOffer | null> {
      const requestedPeriod = parsePeriodKey(query.period);
      if (!requestedPeriod.ok) return null;
      const workshop = await deps.workshops.findBySlug(query.slug);
      if (!workshop || workshop.status !== "published") return null;
      const period = await deps.periods.findByWorkshopPeriod(
        workshop.id,
        requestedPeriod.value,
      );
      if (
        !period ||
        period.workshopId !== workshop.id ||
        period.period !== requestedPeriod.value ||
        period.status !== "open" ||
        period.period < cordobaMonthOf(deps.clock.now())
      )
        return null;
      const turnos = period.turnos
        .filter((turno) => turno.turnoActive)
        .map((turno) => ({
          id: turno.turnoId,
          label: turno.label,
          weekday: turno.weekday,
          startsAt: turno.startsAt,
          endsAt: turno.endsAt,
          capacity: turno.capacity,
        }));
      if (!turnos.length) return null;
      return {
        workshop: { id: workshop.id, name: workshop.name },
        period: {
          id: period.id,
          period: period.period,
          fee: period.fee,
          materialsRequired: period.materialsRequired,
        },
        turnos,
      };
    },
  };
}
