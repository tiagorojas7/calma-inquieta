import { describe, expect, it } from "vitest";
import { buildDirectionsUrl } from "~/modules/site-content";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "~/testing/fakes/in-memory-site-content-source";
import { createSiteContent } from "~/modules/site-content";
import { createLoaderArgs } from "~/testing/react-router";
import { loader, meta } from "./contact";

const FAKE_DIGITS = "3510000000";

async function run(services = createTestServices()) {
  return loader(createLoaderArgs(services, "/contacto") as never);
}

describe("contact loader", () => {
  it("returns the page copy, links, JSON-LD and the meta input", async () => {
    const services = createTestServices();
    const profile = await services.siteContent.getBusinessProfile();
    const result = await run(services);
    expect(result.heading).toBe("Contacto");
    expect(result.intro).toBe("Escribinos cuando quieras.");
    expect(result.directionsHref).toBe(buildDirectionsUrl(profile.address));
    expect(result.metaInput).toMatchObject({
      title: "Contacto",
      path: "/contacto",
      siteName: "Calma Inquieta",
      baseUrl: services.site.baseUrl,
      indexingEnabled: services.site.indexingEnabled,
    });
    const descriptors = meta({ loaderData: result } as never) as readonly {
      title?: string;
    }[];
    expect(descriptors[0]?.title).toBe("Contacto | Calma Inquieta");
    const ld = JSON.parse(result.jsonLd) as Record<string, unknown>;
    expect(ld["@type"]).toBe("LocalBusiness");
  });

  it("lists the address as text, the WhatsApp link and Instagram only", async () => {
    const result = await run();
    expect(result.items.map((item) => item.id)).toEqual([
      "address",
      "whatsapp",
      "instagram",
    ]);
    const [address, whatsapp, instagram] = result.items;
    expect(address).toMatchObject({
      icon: "pin",
      value: "Calle Falsa 123, Argüello, Córdoba",
    });
    expect(address?.href).toBeUndefined();
    expect(whatsapp?.href).toMatch(
      /^https:\/\/wa\.me\/549\d{10}\?text=Hola%2C%20/,
    );
    expect(instagram).toMatchObject({
      value: "@calma.inquieta",
      href: "https://www.instagram.com/calma.inquieta/",
    });
  });

  it("does not print the provisional WhatsApp number", async () => {
    const result = await run();
    const whatsapp = result.items.find((item) => item.id === "whatsapp");
    expect(whatsapp?.value).toBe("Escribinos por WhatsApp");
    // The wa.me href legitimately carries the digits; only printed text must not.
    expect(
      result.items
        .map((item) => item.value)
        .join(" ")
        .replace(/\D/g, ""),
    ).not.toContain(FAKE_DIGITS);
    expect(result.jsonLd.replace(/\D/g, "")).not.toContain(FAKE_DIGITS);
  });

  it("prints the number once it is no longer provisional", async () => {
    const raw = buildRawSiteContent();
    const result = await run(
      createTestServices({
        siteContent: createSiteContent(
          createInMemorySiteContentSource({
            ...raw,
            profile: {
              ...raw.profile,
              whatsapp: { display: "351 000 0000", provisional: false },
            },
          }),
        ),
      }),
    );
    expect(result.items.find((item) => item.id === "whatsapp")?.value).toBe(
      "351 000 0000",
    );
  });

  it("adds email and hours rows only when the profile confirms them", async () => {
    const raw = buildRawSiteContent();
    const result = await run(
      createTestServices({
        siteContent: createSiteContent(
          createInMemorySiteContentSource({
            ...raw,
            profile: {
              ...raw.profile,
              email: { value: "hola@example.test", confirmed: true },
              hours: {
                value: [
                  { days: ["Mo", "We"], opens: "09:00", closes: "18:00" },
                ],
                confirmed: true,
              },
            },
          }),
        ),
      }),
    );
    const byId = Object.fromEntries(result.items.map((i) => [i.id, i]));
    expect(byId.email).toMatchObject({
      icon: "mail",
      value: "hola@example.test",
      href: "mailto:hola@example.test",
    });
    expect(byId.hours).toMatchObject({
      icon: "clock",
      value: "Lun, Mié 09:00-18:00",
    });
  });
});
