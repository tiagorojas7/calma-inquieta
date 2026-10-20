import type {
  EnrollmentOffer,
  EnrollmentOfferLookup,
  EnrollmentOfferQuery,
} from "~/modules/enrollments/application/offer-lookup";

/**
 * Serves one offer per slug. The month in the query is ignored: the fixture
 * already is "the offer for the requested month" (or has `period: null`).
 */
export class InMemoryOfferLookup implements EnrollmentOfferLookup {
  lookups = 0;

  private readonly offers: readonly EnrollmentOffer[];
  private readonly slug: string;

  constructor(offers: readonly EnrollmentOffer[], slug = "ceramica-inicial") {
    this.offers = offers;
    this.slug = slug;
  }

  findOffer(query: EnrollmentOfferQuery): Promise<EnrollmentOffer | null> {
    this.lookups += 1;
    return Promise.resolve(
      query.slug === this.slug ? (this.offers[0] ?? null) : null,
    );
  }
}
