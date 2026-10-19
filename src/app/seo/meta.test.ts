import { describe, expect, it } from "vitest";
import { DEFAULT_SHARE_IMAGE } from "~/modules/site-content";
import { buildPageMeta, truncateDescription } from "./meta";
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
        {
          tagName: "link",
          rel: "canonical",
          href: "https://example.test/contacto",
        },
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

describe("buildPageMeta og:image", () => {
  const base = {
    title: "Intensivo Demo",
    description: "Resumen.",
    path: "/intensivos/intensivo-demo",
    siteName: "Calma Inquieta",
    baseUrl: "https://example.test",
    indexingEnabled: true,
  };

  it("og:image is the absolute URL of DEFAULT_SHARE_IMAGE", () => {
    expect(buildPageMeta(base)).toContainEqual({
      property: "og:image",
      content: `https://example.test${DEFAULT_SHARE_IMAGE.path}`,
    });
  });

  it("emits og:image:width 1200 and og:image:height 630", () => {
    const result = buildPageMeta(base);

    expect(result).toContainEqual({
      property: "og:image:width",
      content: "1200",
    });
    expect(result).toContainEqual({
      property: "og:image:height",
      content: "630",
    });
  });

  it("omits the size tags when an ogImage override is given", () => {
    const result = buildPageMeta({ ...base, ogImage: "/imagenes/cover.jpg" });

    expect(
      result.some((entry) => String(entry.property).startsWith("og:image:")),
    ).toBe(false);
  });

  it("the default share image is a jpg under /media/share/ and not a stand-in", () => {
    expect(DEFAULT_SHARE_IMAGE.path.endsWith(".jpg")).toBe(true);
    expect(DEFAULT_SHARE_IMAGE.path.startsWith("/media/share/")).toBe(true);
    expect(DEFAULT_SHARE_IMAGE.path).not.toContain("/media/stand-ins/");
    expect([DEFAULT_SHARE_IMAGE.width, DEFAULT_SHARE_IMAGE.height]).toEqual([
      1200, 630,
    ]);
  });

  it("uses the absolute URL of the given ogImage", () => {
    expect(
      buildPageMeta({ ...base, ogImage: "/imagenes/cover.jpg" }),
    ).toContainEqual({
      property: "og:image",
      content: "https://example.test/imagenes/cover.jpg",
    });
  });
});

describe("truncateDescription", () => {
  it("leaves short text intact", () => {
    expect(truncateDescription("Texto corto.", 160)).toBe("Texto corto.");
    const exact = "a".repeat(160);
    expect(truncateDescription(exact, 160)).toBe(exact);
  });

  it("cuts at the last word boundary within 159 characters and appends an ellipsis", () => {
    const text = `${"palabra ".repeat(40)}final`;
    const result = truncateDescription(text, 160);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("…")).toBe(true);
    expect(result.slice(0, -1)).toBe(
      text.slice(0, result.length - 1).trimEnd(),
    );
    expect(result.slice(0, -1).endsWith(" ")).toBe(false);
    expect(text.startsWith(result.slice(0, -1))).toBe(true);
    expect(text[result.length - 1]).toBe(" ");
  });

  it("hard-cuts a single word longer than the limit", () => {
    const result = truncateDescription("x".repeat(300), 160);
    expect(result).toBe(`${"x".repeat(159)}…`);
  });
});
