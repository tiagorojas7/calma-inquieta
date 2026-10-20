import { DEFAULT_SHARE_IMAGE, type BusinessProfile } from "~/modules/site-content";
import { CORDOBA_UTC_OFFSET } from "~/modules/workshops";
import { canonicalUrl } from "./canonical";

/** The postal address shared by LocalBusiness and the Event location. */
function buildPostalAddress(profile: BusinessProfile) {
  const { address } = profile;
  return {
    "@type": "PostalAddress",
    streetAddress: `${address.street}, ${address.locality}`,
    addressLocality: address.city,
    addressRegion: address.region,
    addressCountry: address.countryCode,
  };
}

/**
 * Builds the LocalBusiness object from the published profile. The profile
 * already omits unconfirmed facts, and the provisional WhatsApp line is never
 * read here, so it cannot leak as a telephone.
 */
export function buildLocalBusinessJsonLd(
  profile: BusinessProfile,
  baseUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.name,
    url: canonicalUrl(baseUrl, "/"),
    address: buildPostalAddress(profile),
    sameAs: [profile.instagram.url],
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.hours
      ? {
          openingHours: profile.hours.map(
            (spec) => `${spec.days.join(",")} ${spec.opens}-${spec.closes}`,
          ),
        }
      : {}),
    ...(profile.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: profile.geo.lat,
            longitude: profile.geo.lng,
          },
        }
      : {}),
  };
}

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/** JSON safe to embed in a script element: nothing can close it or start a comment. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (char) => ESCAPES[char] ?? char,
  );
}

/** Structural input: plain strings and numbers, no module types. */
export interface EventInput {
  readonly name: string;
  readonly summary: string;
  /** Canonical detail path, for example `/intensivos/torno`. */
  readonly path: string;
  /** `YYYY-MM-DD`, a Córdoba calendar date. */
  readonly date: string;
  readonly startsAt: string;
  readonly endsAt: string;
  /** The intensivo price in pesos; the deposit is never passed. */
  readonly pricePesos: number;
  readonly status: "open" | "paused";
  readonly teacherName?: string | undefined;
  /** Possibly empty; the builder applies the share-image fallback. */
  readonly images: readonly string[];
}

const AVAILABILITY = {
  open: "https://schema.org/LimitedAvailability",
  paused: "https://schema.org/OutOfStock",
} as const;

function formatOfferPrice(pesos: number): string {
  return Number.isInteger(pesos) ? String(pesos) : pesos.toFixed(2);
}

/**
 * One Event for an intensivo detail page. Pausing enrollment does not move the
 * event, so both states are `EventScheduled`. Seats are unknown, so `SoldOut`
 * and capacity properties are never emitted.
 */
export function buildEventJsonLd(
  input: EventInput,
  profile: BusinessProfile,
  baseUrl: string,
) {
  const url = canonicalUrl(baseUrl, input.path);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    description: input.summary,
    startDate: `${input.date}T${input.startsAt}:00${CORDOBA_UTC_OFFSET}`,
    endDate: `${input.date}T${input.endsAt}:00${CORDOBA_UTC_OFFSET}`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: profile.name,
      address: buildPostalAddress(profile),
    },
    organizer: {
      "@type": "Organization",
      name: profile.name,
      url: canonicalUrl(baseUrl, "/"),
    },
    ...(input.teacherName
      ? { performer: { "@type": "Person", name: input.teacherName } }
      : {}),
    image:
      input.images.length > 0
        ? input.images.map((src) => canonicalUrl(baseUrl, src))
        : [canonicalUrl(baseUrl, DEFAULT_SHARE_IMAGE.path)],
    offers: {
      "@type": "Offer",
      price: formatOfferPrice(input.pricePesos),
      priceCurrency: "ARS",
      url,
      availability: AVAILABILITY[input.status],
    },
  };
}
