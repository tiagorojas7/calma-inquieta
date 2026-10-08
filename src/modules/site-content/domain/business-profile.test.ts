import { describe, expect, it } from "vitest";
import { publishProfile, type RawBusinessProfile } from "./business-profile";

const BASE: RawBusinessProfile = {
  name: "Calma Inquieta",
  bajada: "Equilibrio entre serenidad y movimiento",
  address: {
    street: "Albert Sabin 6079",
    locality: "Argüello",
    city: "Córdoba",
    region: "Córdoba",
    countryCode: "AR",
  },
  instagramHandle: "calma.inquieta",
  whatsapp: { display: "351 000 0000", provisional: true },
  whatsappMessages: {
    general: "Hola",
    talleres: "Hola, talleres",
    intensivos: "Hola, intensivos",
    "eventos-privados": "Hola, eventos",
  },
};

const HOURS = [{ days: ["Sa"], opens: "10:00", closes: "13:00" }] as const;

describe("publishProfile", () => {
  it("exposes confirmed email, phone, hours and geo", () => {
    const profile = publishProfile({
      ...BASE,
      email: { value: "hola@example.test", confirmed: true },
      phone: { value: "351 111 1111", confirmed: true },
      hours: { value: HOURS, confirmed: true },
      geo: { value: { lat: -31.3, lng: -64.3 }, confirmed: true },
    });

    expect(profile.email).toBe("hola@example.test");
    expect(profile.phone).toBe("351 111 1111");
    expect(profile.hours).toEqual(HOURS);
    expect(profile.geo).toEqual({ lat: -31.3, lng: -64.3 });
  });

  it("leaves unconfirmed facts out, so the property is absent", () => {
    const profile = publishProfile({
      ...BASE,
      email: { value: "hola@example.test", confirmed: false },
      phone: { value: "351 111 1111", confirmed: false },
      hours: { value: HOURS, confirmed: false },
      geo: { value: { lat: 1, lng: 2 }, confirmed: false },
    });

    expect(profile).not.toHaveProperty("email");
    expect(profile).not.toHaveProperty("phone");
    expect(profile).not.toHaveProperty("hours");
    expect(profile).not.toHaveProperty("geo");
  });

  it("publishes a profile with no optional facts at all", () => {
    const profile = publishProfile(BASE);

    expect(Object.keys(profile).sort()).toEqual([
      "address",
      "bajada",
      "instagram",
      "name",
      "whatsapp",
      "whatsappMessages",
    ]);
  });

  it("derives the instagram handle and url, and drops the raw handle", () => {
    const profile = publishProfile(BASE);

    expect(profile.instagram).toEqual({
      handle: "calma.inquieta",
      url: "https://www.instagram.com/calma.inquieta/",
    });
    expect(profile).not.toHaveProperty("instagramHandle");
  });

  it("keeps the locality and the city apart", () => {
    const profile = publishProfile(BASE);

    expect(profile.address.locality).toBe("Argüello");
    expect(profile.address.city).toBe("Córdoba");
    expect(profile.whatsapp).toEqual({
      display: "351 000 0000",
      provisional: true,
    });
  });

  it("does not mutate its input", () => {
    const raw: RawBusinessProfile = {
      ...BASE,
      email: { value: "hola@example.test", confirmed: true },
    };
    const snapshot = structuredClone(raw);

    publishProfile(raw);

    expect(raw).toEqual(snapshot);
  });
});
