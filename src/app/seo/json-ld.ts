import type { BusinessProfile } from "~/modules/site-content";
import { canonicalUrl } from "./canonical";

/**
 * Builds the LocalBusiness object from the published profile. The profile
 * already omits unconfirmed facts, and the provisional WhatsApp line is never
 * read here, so it cannot leak as a telephone.
 */
export function buildLocalBusinessJsonLd(
  profile: BusinessProfile,
  baseUrl: string,
) {
  const { address } = profile;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.name,
    url: canonicalUrl(baseUrl, "/"),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${address.street}, ${address.locality}`,
      addressLocality: address.city,
      addressRegion: address.region,
      addressCountry: address.countryCode,
    },
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
