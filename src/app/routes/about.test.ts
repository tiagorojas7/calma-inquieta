import { describe, expect, it } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { loader, meta } from "./about";

describe("about loader", () => {
  it("maps history, value proposition, sections and the meta input", async () => {
    const services = createTestServices();
    const result = await loader(
      createLoaderArgs(services, "/quienes-somos") as never,
    );
    expect(result.heading).toBe("Quiénes somos");
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.valueProposition).toEqual(expect.any(String));
    expect(result.values.length).toBeGreaterThan(0);
    expect(result.gallery).toBeDefined();
    expect(result.videos).toEqual([]);
    expect(result.faq.length).toBeGreaterThan(0);
    expect(result.sectionHeadings.faq).toEqual(expect.any(String));
    expect(result.metaInput.path).toBe("/quienes-somos");
    expect(result.metaInput.siteName).toBe("Calma Inquieta");
    expect(result.metaInput.baseUrl).toBe(services.site.baseUrl);
    expect(result.metaInput.indexingEnabled).toBe(
      services.site.indexingEnabled,
    );
    const descriptors = meta({ loaderData: result } as never) as readonly {
      title?: string;
    }[];
    expect(descriptors[0]?.title).toBe("Quiénes somos | Calma Inquieta");
  });
});
