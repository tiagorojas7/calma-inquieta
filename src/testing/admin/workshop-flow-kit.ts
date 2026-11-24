import { createTeacherLookup } from "~/modules/teachers";
import {
  createWorkshopPeriodsService,
  type WorkshopPeriodsService,
} from "~/modules/workshops";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryWorkshopPeriodRepository } from "~/testing/fakes/in-memory-workshop-period-repository";
import { FLOW_NOW } from "./flow-months";
import { workshopsFixture } from "./route-kit";

/**
 * Real workshops and periods services over shared in-memory repositories, so a
 * route can create, publish and open a month end to end.
 */
export function workshopFlowFixture() {
  const base = workshopsFixture();
  const periodRepository = new InMemoryWorkshopPeriodRepository();
  let next = 0;
  const periods: WorkshopPeriodsService = createWorkshopPeriodsService({
    repository: periodRepository,
    workshops: base.repository,
    turnos: base.turnos,
    teachers: createTeacherLookup(base.teachers.repository),
    confirmedSeats: { confirmedSeats: () => Promise.resolve(0) },
    clock: fixedClock(FLOW_NOW),
    newId: () => `p${String(++next)}`,
  });
  return { ...base, periodRepository, periods };
}

export * from "./flow-months";
