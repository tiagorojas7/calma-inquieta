import { ok } from "~/modules/_shared";
import type { Material, MaterialsService } from "~/modules/materials";
import { createTeacherLookup } from "~/modules/teachers";
import {
  createWorkshopPeriodsService,
  type WorkshopPeriodsService,
} from "~/modules/workshops";
import { createUnavailableService } from "~/composition/unavailable-service";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { buildMaterial } from "~/testing/fakes/admin-builders";
import { InMemoryWorkshopPeriodRepository } from "~/testing/fakes/in-memory-workshop-period-repository";
import { FLOW_NOW } from "./flow-months";
import { withOverrides, workshopsFixture } from "./route-kit";

/**
 * Real workshops and periods services over shared in-memory repositories, so a
 * route can create, publish and open a month end to end. The materials service
 * lists the given catalog as selectable.
 */
export function workshopFlowFixture(catalog: readonly Material[] = []) {
  const base = workshopsFixture();
  const periodRepository = new InMemoryWorkshopPeriodRepository();
  const byId = new Map(catalog.map((material) => [material.id, material]));
  let next = 0;
  const periods: WorkshopPeriodsService = createWorkshopPeriodsService({
    repository: periodRepository,
    workshops: base.repository,
    turnos: base.turnos,
    teachers: createTeacherLookup(base.teachers.repository),
    materials: {
      findByIds: (ids) =>
        Promise.resolve(
          new Map(
            ids.flatMap((id) => {
              const found = byId.get(id);
              return found ? [[id, found] as const] : [];
            }),
          ),
        ),
    },
    confirmedSeats: { confirmedSeats: () => Promise.resolve(0) },
    clock: fixedClock(FLOW_NOW),
    newId: () => `p${String(++next)}`,
  });
  const materials = withOverrides(
    createUnavailableService<MaterialsService>(),
    {
      listSelectable: () =>
        Promise.resolve(
          ok(
            catalog.map((material) => ({
              id: material.id,
              name: material.name,
              category: material.category,
              hasImage: material.image !== null,
              supplierName: material.supplier.name,
              variantCount: material.variants.length,
              active: material.active,
              available: material.available,
            })),
          ),
        ),
    },
  );
  return { ...base, periodRepository, periods, materials };
}

export { buildMaterial };
export * from "./flow-months";
