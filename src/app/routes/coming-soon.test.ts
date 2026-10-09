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
