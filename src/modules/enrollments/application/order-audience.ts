import type { Money } from "~/modules/_shared";

/** What a scheduled reminder needs of one order. */
export interface OrderAudienceRow {
  readonly number: string;
  readonly publicId: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly workshopName: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoLabel: string;
  /** `HH:MM:SS`, as stored. */
  readonly startsAt: string;
  readonly total: Money;
}

/** Read-only audiences for scheduled notifications; no lines, audit or payment notes. */
export interface OrderAudienceReader {
  /** Paid orders (and the materials states after paid) with a turno on this ISO weekday (1 = Monday) of `period`. */
  classesOn(
    weekday: number,
    period: string,
  ): Promise<readonly OrderAudienceRow[]>;
  /** Orders pending confirmation whose request instant is in `[from, to)`. */
  pendingRequestedBetween(
    from: Date,
    to: Date,
  ): Promise<readonly OrderAudienceRow[]>;
}
