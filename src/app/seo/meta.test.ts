import { describe, expect, it } from "vitest";
import { buildPageMeta } from "./meta";
describe("buildPageMeta", () => {
  it("builds canonical and social descriptors", () => {
    const result = buildPageMeta({
      title: "Contacto",
      description: "Escribinos.",
      path: "/contacto",
      siteName: "Calma Inquieta",
      baseUrl: "https://example.test",
      indexingEnabled: false,
    });
    expect(result).toEqual(
      expect.arrayContaining([
        { title: "Contacto | Calma Inquieta" },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:locale", content: "es_AR" },
      ]),
    );
  });
  it("rejects blank descriptions", () => {
    expect(() =>
      buildPageMeta({
        title: "x",
        description: " ",
        path: "/",
        siteName: "x",
        baseUrl: "https://x.test",
        indexingEnabled: false,
      }),
    ).toThrow();
  });
});
