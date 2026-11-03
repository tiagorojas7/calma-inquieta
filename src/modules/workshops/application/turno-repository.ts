import type { NotFound, Result } from "~/modules/_shared";
import type { Weekday } from "./contracts";
import type { StoredMonthlyWorkshop } from "./monthly-workshop-repository";

export interface StoredTurno {
  readonly id: string;
  readonly workshopId: string;
  readonly label: string;
  readonly labelKey: string;
  readonly weekday: Weekday;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly defaultCapacity: number;
  readonly active: boolean;
}
export interface TurnoLabelConflict {
  readonly kind: "label-conflict";
}
/** A new turno's default-capacity row in an open month, written with the turno. */
export interface PeriodJoin {
  readonly periodId: string;
  readonly capacity: number;
}
export type TurnoMutation =
  | {
      readonly kind: "insert";
      readonly value: StoredTurno;
      /** Open months that offer the new turno; stored in the same transaction. */
      readonly joinPeriods?: readonly PeriodJoin[];
    }
  | { readonly kind: "update"; readonly value: StoredTurno }
  | { readonly kind: "delete"; readonly id: string };
/**
 * Owns a turno change and its owning workshop audit update as one operation.
 * Database adapters implement this with a transaction; fakes restore turno state
 * if their workshop writer refuses the audit update.
 */
export interface TurnoRepository {
  insert(value: StoredTurno): Promise<Result<void, TurnoLabelConflict>>;
  update(
    value: StoredTurno,
  ): Promise<Result<void, TurnoLabelConflict | NotFound>>;
  findById(id: string): Promise<StoredTurno | null>;
  listForWorkshop(workshopId: string): Promise<readonly StoredTurno[]>;
  countActiveForWorkshop(workshopId: string): Promise<number>;
  delete(id: string): Promise<Result<void, NotFound>>;
  mutate(
    workshop: StoredMonthlyWorkshop,
    mutation: TurnoMutation,
  ): Promise<Result<void, TurnoLabelConflict | NotFound>>;
}
