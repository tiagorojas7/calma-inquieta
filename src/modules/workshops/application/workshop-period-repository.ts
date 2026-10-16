import type { NotFound, Result } from "~/modules/_shared";
import type { PeriodKey, WorkshopPeriod } from "./contracts";

export type StoredWorkshopPeriod = WorkshopPeriod;
export type PeriodExists = {
  readonly kind: "period-exists";
  readonly periodId: string;
};
export type DeletePeriodOutcome = "deleted" | "not-draft" | "not-found";

/** Atomic owner of the period root, snapshot, capacities and audit record. */
export interface WorkshopPeriodRepository {
  insert(value: StoredWorkshopPeriod): Promise<Result<void, PeriodExists>>;
  update(value: StoredWorkshopPeriod): Promise<Result<void, NotFound>>;
  findById(id: string): Promise<StoredWorkshopPeriod | null>;
  findByWorkshopPeriod(
    workshopId: string,
    period: PeriodKey,
  ): Promise<StoredWorkshopPeriod | null>;
  listForWorkshop(workshopId: string): Promise<readonly StoredWorkshopPeriod[]>;
  latestBefore(
    workshopId: string,
    period: PeriodKey,
  ): Promise<StoredWorkshopPeriod | null>;
  /** Includes historical periods whose workshop or turno is now inactive. */
  isTurnoUsed(turnoId: string): Promise<boolean>;
  deleteDraft(id: string): Promise<DeletePeriodOutcome>;
}
