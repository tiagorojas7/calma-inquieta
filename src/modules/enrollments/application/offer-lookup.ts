import type { Money } from "~/modules/_shared";
import type { PeriodStatus } from "../domain/period-window";

export interface OfferedTurno {
  readonly id: string;
  readonly label: string;
  /** 0 to 6 as stored by `workshops`. */
  readonly weekday: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly capacity: number;
}

export interface EnrollmentOffer {
  readonly workshop: {
    readonly id: string;
    readonly name: string;
    readonly published: boolean;
    readonly paused: boolean;
  };
  /** `null` when the workshop has no period for the requested month. */
  readonly period: {
    readonly id: string;
    /** `YYYY-MM`. */
    readonly period: string;
    readonly status: PeriodStatus;
    readonly fee: Money;
    readonly materialsRequired: boolean;
  } | null;
  /** Active turnos of this workshop that the period offers. */
  readonly turnos: readonly OfferedTurno[];
}

export interface EnrollmentOfferQuery {
  readonly slug: string;
  /** `YYYY-MM`. */
  readonly period: string;
}

/** Consumer-defined port; `composition` adapts `workshops` to it (slice E6). */
export interface EnrollmentOfferLookup {
  /** `null` when no workshop has that slug. */
  findOffer(query: EnrollmentOfferQuery): Promise<EnrollmentOffer | null>;
}
