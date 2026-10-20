import { describe, expect, it } from "vitest";
import type { BusinessProfile } from "~/modules/site-content";
import { DEFAULT_SHARE_IMAGE } from "~/modules/site-content";
import { canonicalUrl } from "./canonical";
import {
  buildEventJsonLd,
  buildLocalBusinessJsonLd,
  serializeJsonLd,
  type EventInput,
} from "./json-ld";

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

const eventInput: EventInput = {
  name: "Intensivo de torno",
  summary: "Un sábado de torno.",
  path: "/intensivos/torno",
  date: "2026-11-14",
  startsAt: "10:00",
  endsAt: "18:00",
  pricePesos: 45000,
  status: "open",
  teacherName: "Docente Demo",
  images: ["/imagenes/a.jpg", "https://cdn.example.test/b.jpg"],
};

function eventJson(overrides: Partial<EventInput> = {}) {
  return buildEventJsonLd({ ...eventInput, ...overrides }, minimal, BASE);
}

describe("buildEventJsonLd", () => {
  it("builds one Event with the Cordoba offset on start and end", () => {
    const event = eventJson();
    expect(event["@context"]).toBe("https://schema.org");
    expect(event["@type"]).toBe("Event");
    expect(event.name).toBe("Intensivo de torno");
    expect(event.description).toBe("Un sábado de torno.");
    expect(event.startDate).toBe("2026-11-14T10:00:00-03:00");
    expect(event.endDate).toBe("2026-11-14T18:00:00-03:00");
  });

  it("takes the location from the profile and sets mode and status", () => {
    const event = eventJson();
    expect(event.location).toEqual({
      "@type": "Place",
      name: "Calma Inquieta",
      address: buildLocalBusinessJsonLd(minimal, BASE).address,
    });
    expect(event.organizer).toEqual({
      "@type": "Organization",
      name: "Calma Inquieta",
      url: "https://example.test/",
    });
    expect(event.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(event.eventAttendanceMode).toBe(
      "https://schema.org/OfflineEventAttendanceMode",
    );
  });

  it("adds a performer only with a teacher", () => {
    expect(eventJson().performer).toEqual({
      "@type": "Person",
      name: "Docente Demo",
    });
    expect(eventJson({ teacherName: undefined })).not.toHaveProperty(
      "performer",
    );
  });

  it("lists absolute image URLs in position order", () => {
    expect(eventJson().image).toEqual([
      "https://example.test/imagenes/a.jpg",
      "https://cdn.example.test/b.jpg",
    ]);
  });

  it("falls back to exactly the share image with no images", () => {
    expect(eventJson({ images: [] }).image).toEqual([
      canonicalUrl(BASE, DEFAULT_SHARE_IMAGE.path),
    ]);
  });

  it("maps open to LimitedAvailability and paused to OutOfStock", () => {
    const open = eventJson().offers;
    expect(open).toEqual({
      "@type": "Offer",
      price: "45000",
      priceCurrency: "ARS",
      url: "https://example.test/intensivos/torno",
      availability: "https://schema.org/LimitedAvailability",
    });
    const paused = eventJson({ status: "paused" });
    expect(paused.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(paused.eventStatus).toBe("https://schema.org/EventScheduled");
  });

  it("never says SoldOut and never carries capacity keys", () => {
    for (const status of ["open", "paused"] as const) {
      const text = JSON.stringify(eventJson({ status }));
      expect(text).not.toContain("SoldOut");
      expect(text).not.toContain("remainingAttendeeCapacity");
      expect(text).not.toContain("maximumAttendeeCapacity");
    }
  });

  it("uses the price as a plain decimal string, whole or with centavos", () => {
    expect(eventJson({ pricePesos: 45000 }).offers.price).toBe("45000");
    expect(eventJson({ pricePesos: 45000.5 }).offers.price).toBe("45000.50");
  });

  it("carries no private sentinel and keeps a script-breaking name inert", () => {
    const sentinel = "SNAPSHOT-SENTINEL";
    const text = serializeJsonLd(
      eventJson({ name: "</script><script>x", summary: "ok" }),
    );
    expect(text).not.toContain("<");
    expect(text).not.toContain(sentinel);
    expect(JSON.parse(text)).toMatchObject({ name: "</script><script>x" });
  });
});
