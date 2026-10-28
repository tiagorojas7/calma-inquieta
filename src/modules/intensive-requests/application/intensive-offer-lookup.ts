import type { Money } from "~/modules/_shared";

/** An intensivo as the seat-request flow sees it, whatever its status. */
export interface IntensiveOffer {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  /** The intensivo lifecycle status, as `workshops` stores it. */
  readonly status: string;
  /** True while the start of the intensivo is still in the future. */
  readonly upcoming: boolean;
  /** `YYYY-MM-DD`, a Córdoba calendar date. */
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
}

/** Consumer-defined port; `composition` wires the `workshops` lookup to it. */
export interface IntensiveOfferLookup {
  findBySlug(slug: string): Promise<IntensiveOffer | null>;
  findById(id: string): Promise<IntensiveOffer | null>;
}
