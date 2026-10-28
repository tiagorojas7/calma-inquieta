import type { Clock, Money } from "~/modules/_shared";
import { startsInFuture } from "../domain/intensive-core";
import type { IntensiveRepository } from "./intensive-repository";

/**
 * An intensivo as the seat-request flow sees it, whatever its status: the
 * terms it asks for, and whether its start is still ahead. No audit, teacher
 * or gallery data travels here.
 */
export interface IntensiveSeatOffer {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly status: string;
  readonly upcoming: boolean;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
}

export interface IntensiveSeatOfferLookup {
  findBySlug(slug: string): Promise<IntensiveSeatOffer | null>;
  findById(id: string): Promise<IntensiveSeatOffer | null>;
}

export interface IntensiveSeatOfferLookupDeps {
  readonly repository: Pick<IntensiveRepository, "findBySlug" | "findById">;
  readonly clock: Clock;
}

/**
 * Actorless read for the seat-request flow. It reports the stored status and
 * lets the consumer decide what is public; administrative services stay
 * actor-first and are not reused at this boundary.
 */
export function createIntensiveSeatOfferLookup(
  deps: IntensiveSeatOfferLookupDeps,
): IntensiveSeatOfferLookup {
  const project = (
    stored: Awaited<ReturnType<IntensiveRepository["findById"]>>,
  ): IntensiveSeatOffer | null =>
    stored === null
      ? null
      : {
          id: stored.id,
          slug: stored.slug,
          name: stored.name,
          status: stored.status,
          upcoming: startsInFuture(
            {
              eventDate: stored.eventDate,
              startsAt: stored.startsAt,
              endsAt: stored.endsAt,
            },
            deps.clock.now(),
          ),
          eventDate: stored.eventDate,
          startsAt: stored.startsAt,
          endsAt: stored.endsAt,
          price: stored.price,
          deposit: stored.deposit,
          capacity: stored.capacity,
          minSeats: stored.minSeats,
          policyText: stored.policyText,
        };
  return {
    findBySlug: async (slug) => project(await deps.repository.findBySlug(slug)),
    findById: async (id) => project(await deps.repository.findById(id)),
  };
}
