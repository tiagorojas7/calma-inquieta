import { describe, expect, it } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { loader } from "./coming-soon";

describe("coming soon loader", () => {
  it("loads the slug from params and builds its WhatsApp link", async () => {
    const services = createTestServices();
    const result = (await loader({
      ...createLoaderArgs(services, "/talleres"),
      params: { slug: "talleres" },
    } as never)) as {
      slug: string;
      title: string;
      whatsappHref: string;
      instagramHref: string;
    };
    expect(result.slug).toBe("talleres");
    expect(typeof result.title).toBe("string");
    expect(result.whatsappHref).toContain("wa.me");
    expect(result.instagramHref).toContain("instagram.com");
  });

  it.each([
    ["intensivos", "coming-soon%2Fintensivos"],
    ["eventos-privados", "coming-soon%2Feventos-privados"],
  ])(
    "loads %s from its React Router client data request without route params",
    async (slug, routeId) => {
      const result = await loader({
        ...createLoaderArgs(
          createTestServices(),
          `/${slug}.data?_routes=${routeId}`,
        ),
        params: {},
      } as never);

      expect(result.slug).toBe(slug);
    },
  );

  it("returns a 404 response for an unsupported pathname", async () => {
    await expect(
      loader({
        ...createLoaderArgs(createTestServices(), "/desconocido"),
        params: { slug: "desconocido" },
      } as never),
    ).rejects.toMatchObject({ data: null, init: { status: 404 } });
  });

  it("returns a 404 response for an unsupported client data request", async () => {
    await expect(
      loader({
        ...createLoaderArgs(
          createTestServices(),
          "/desconocido.data?_routes=coming-soon%2Fdesconocido",
        ),
        params: {},
      } as never),
    ).rejects.toMatchObject({ data: null, init: { status: 404 } });
  });

  it("returns no WhatsApp CTA when the number is invalid", async () => {
    const base = createTestServices();
    const services = {
      ...base,
      siteContent: {
        ...base.siteContent,
        getBusinessProfile: () =>
          base.siteContent.getBusinessProfile().then((value) => ({
            ...value,
            whatsapp: { display: "invalid", provisional: true },
          })),
      },
    };
    const result = await loader({
      ...createLoaderArgs(services, "/talleres"),
      params: { slug: "talleres" },
    } as never);
    expect(result.whatsappHref).toBeUndefined();
  });
});
