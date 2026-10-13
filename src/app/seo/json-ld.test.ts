import { describe, expect, it } from "vitest";
import type { BusinessProfile } from "~/modules/site-content";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "./json-ld";

const PROVISIONAL_DIGITS = "3517395239";

const minimal: BusinessProfile = {
  name: "Calma Inquieta",
  bajada: "Equilibrio entre serenidad y movimiento",
  address: {
    street: "Albert Sabin 6079",
    locality: "Argüello",
    city: "Córdoba",
    region: "Córdoba",
    countryCode: "AR",
  },
  instagram: {
    handle: "calma.inquieta",
    url: "https://www.instagram.com/calma.inquieta/",
  },
  whatsapp: { display: "351 739 5239", provisional: true },
  whatsappMessages: {
    general: "Hola",
    talleres: "Hola",
    intensivos: "Hola",
    "eventos-privados": "Hola",
  },
};

const BASE = "https://example.test";

describe("buildLocalBusinessJsonLd", () => {
  it("builds a minimal LocalBusiness with a postal address and sameAs", () => {
    expect(buildLocalBusinessJsonLd(minimal, BASE)).toEqual({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Calma Inquieta",
      url: "https://example.test/",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Albert Sabin 6079, Argüello",
        addressLocality: "Córdoba",
        addressRegion: "Córdoba",
        addressCountry: "AR",
      },
      sameAs: ["https://www.instagram.com/calma.inquieta/"],
    });
  });

  it("omits telephone, email, openingHours and geo when not confirmed", () => {
    const result = buildLocalBusinessJsonLd(minimal, BASE);
    for (const key of ["telephone", "email", "openingHours", "geo"]) {
      expect(result).not.toHaveProperty(key);
    }
  });

  it("adds confirmed telephone, email, hours and geo", () => {
    const result = buildLocalBusinessJsonLd(
      {
        ...minimal,
        phone: "+54 351 000 0000",
        email: "hola@example.test",
        hours: [{ days: ["Mo", "Tu"], opens: "09:00", closes: "18:00" }],
        geo: { lat: -31.4, lng: -64.2 },
      },
      BASE,
    );
    expect(result).toMatchObject({
      telephone: "+54 351 000 0000",
      email: "hola@example.test",
      openingHours: ["Mo,Tu 09:00-18:00"],
      geo: { "@type": "GeoCoordinates", latitude: -31.4, longitude: -64.2 },
    });
  });

  it("never emits the provisional WhatsApp number", () => {
    const text = serializeJsonLd(buildLocalBusinessJsonLd(minimal, BASE));
    expect(text.replace(/\D/g, "")).not.toContain(PROVISIONAL_DIGITS);
    expect(text).not.toContain("wa.me");
    expect(text).not.toContain("telephone");
  });

  it("does not describe a FAQPage", () => {
    const text = serializeJsonLd(buildLocalBusinessJsonLd(minimal, BASE));
    expect(text).not.toContain("FAQPage");
  });
});

describe("serializeJsonLd", () => {
  it("keeps a script-breaking name inert", () => {
    const text = serializeJsonLd(
      buildLocalBusinessJsonLd(
        { ...minimal, name: "</script><script>x" },
        BASE,
      ),
    );
    expect(text).not.toContain("</script>");
    expect(text).not.toContain("<");
    expect(text).toContain("\\u003c/script\\u003e");
  });

  it("escapes <, >, &, U+2028 and U+2029 as unicode sequences", () => {
    const text = serializeJsonLd({ v: "<>&\u2028\u2029" });
    expect(text).toBe('{"v":"\\u003c\\u003e\\u0026\\u2028\\u2029"}');
  });

  it("round-trips to the original value", () => {
    const value = { v: "a <b> & c\u2028d" };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });
});
