import { describe, expect, it } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { loader, meta } from "./home";

describe("home loader", () => {
  it("maps approved content, empty catalog lists, contact data and site meta", async () => {
    const services = createTestServices();
    const result = await loader(createLoaderArgs(services, "/") as never);
    expect(result.monthly).toEqual([]);
    expect(result.intensivos).toEqual([]);
    expect(result.trustClaims.every((claim) => claim.approved)).toBe(true);
    expect(result.testimonials).toEqual([]);
    expect(result.hero).toBeDefined();
    expect(result.teaser).toBeDefined();
    expect(result.contactBand).toBeDefined();
    expect(result.site).toEqual(services.site);
    expect(result.metaInput.title).toEqual(expect.any(String));
    expect(result.metaInput.description).toEqual(expect.any(String));
    expect(result.metaInput.path).toBe("/");
    expect(result.metaInput.siteName).toBe("Calma Inquieta");
    expect(result.metaInput.baseUrl).toBe(services.site.baseUrl);
    expect(result.metaInput.indexingEnabled).toBe(
      services.site.indexingEnabled,
    );
    const descriptors = meta({ loaderData: result } as never) as readonly {
      title?: string;
    }[];
    expect(descriptors[0]?.title).toContain("Inicio");
  });
});
