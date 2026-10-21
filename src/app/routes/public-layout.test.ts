import { describe, expect, it } from "vitest";
import { buildDirectionsUrl } from "~/modules/site-content";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { loader } from "./public-layout";

const profile = {
  name: "Calma Inquieta",
  bajada: "Equilibrio entre serenidad y movimiento",
  address: {
    street: "Albert Sabin 6079",
    locality: "Argüello",
    city: "Córdoba",
    region: "Córdoba",
    countryCode: "AR" as const,
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
  email: "hola@example.test",
};

describe("public layout loader", () => {
  it("maps profile data to chrome props and hides unconfirmed facts", async () => {
    const services = createTestServices({
      siteContent: {
        ...createTestServices().siteContent,
        getBusinessProfile: () => Promise.resolve(profile),
      },
    });
    const brand = await services.siteContent.getBrand();
    expect(brand.logo).toBeDefined();
    await expect(loader(createLoaderArgs(services) as never)).resolves.toEqual({
      wordmark: "Calma Inquieta",
      whatsappHref: "https://wa.me/5493517395239?text=Hola",
      instagramHref: profile.instagram.url,
      directionsHref: buildDirectionsUrl(profile.address),
      brand,
      footer: {
        address: profile.address,
        bajada: profile.bajada,
        whatsapp: profile.whatsapp,
        email: profile.email,
      },
    });
  });

  it("omits WhatsApp CTA data when its number is invalid", async () => {
    const services = createTestServices({
      siteContent: {
        ...createTestServices().siteContent,
        getBusinessProfile: () =>
          Promise.resolve({
            ...profile,
            whatsapp: { display: "invalid", provisional: true },
          }),
      },
    });
    const result = await loader(createLoaderArgs(services) as never);
    expect(result.whatsappHref).toBeUndefined();
  });

  it("passes only the published logos on, so a missing one leaves the wordmark alone", async () => {
    const services = createTestServices({
      siteContent: {
        ...createTestServices().siteContent,
        getBusinessProfile: () => Promise.resolve(profile),
        getBrand: () => Promise.resolve({}),
      },
    });

    const result = await loader(createLoaderArgs(services) as never);

    expect(result.brand).toEqual({});
  });
});
