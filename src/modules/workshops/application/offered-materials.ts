import type { WorkshopPeriodRepository } from "./workshop-period-repository";
import type { WorkshopOfferedMaterialIdsLookup } from "./contracts";

export interface WorkshopOfferedMaterialIdsLookupDeps {
  readonly periods: Pick<WorkshopPeriodRepository, "findById">;
}

/**
 * Actorless B9 offer read. The stored material sequence is the authoritative
 * inclusion and ordering source; current sale facts belong to `materials`.
 */
export function createWorkshopOfferedMaterialIdsLookup({
  periods,
}: WorkshopOfferedMaterialIdsLookupDeps): WorkshopOfferedMaterialIdsLookup {
  return {
    async listOfferedMaterialIds(periodId) {
      const period = await periods.findById(periodId);
      return period?.materials.map((material) => material.id) ?? [];
    },
  };
}
