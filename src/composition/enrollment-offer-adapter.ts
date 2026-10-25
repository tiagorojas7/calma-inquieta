import type { EnrollmentOfferLookup } from "~/modules/enrollments";
import type { WorkshopEnrollmentOfferLookup } from "~/modules/workshops";

/** Adapts the bounded workshop public-read API to enrollment's consumer-owned port. */
export function createEnrollmentOfferAdapter(
  workshops: WorkshopEnrollmentOfferLookup,
): EnrollmentOfferLookup {
  return {
    async findOffer(query) {
      const offer = await workshops.findEnrollmentOffer(query);
      return offer
        ? {
            workshop: {
              ...offer.workshop,
              published: true,
              paused: false,
            },
            period: { ...offer.period, status: "open" },
            turnos: offer.turnos,
          }
        : null;
    },
  };
}
