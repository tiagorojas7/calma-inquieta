import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { parseColorTokens } from "./ui/tokens/contrast";
import { ErrorBoundary, Layout, links } from "./root";

// Vitest resolves a ?url css import to "", so pin the build-time href.
vi.mock("./ui/styles/app.css?url", () => ({ default: "/assets/app.css" }));

// Meta, Links, Scripts and ScrollRestoration need a framework router
// context; the document shell is what these tests inspect.
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  Meta: () => null,
  Links: () => null,
  Scripts: () => null,
  ScrollRestoration: () => null,
}));

const render = (error: unknown) =>
  renderToStaticMarkup(createElement(ErrorBoundary, { error } as never));

describe("root error boundary", () => {
  it("renders a not-found page for a 404 response", () => {
    const html = render({
      status: 404,
      statusText: "Not Found",
      internal: false,
      data: null,
    });

    expect(html).toContain("Page not found");
    expect(html).not.toContain("Something went wrong");
  });

  it("renders a generic page for any other error without its message", () => {
    const html = render(new Error("connect ECONNREFUSED secret-host:5432"));

    expect(html).toContain("Something went wrong");
    expect(html).not.toContain("secret-host");
    expect(html).not.toContain("ECONNREFUSED");
  });

  it("renders a generic page for a non-404 route error response", () => {
    const html = render({
      status: 500,
      statusText: "Internal Server Error",
      internal: false,
      data: "secret detail",
    });

    expect(html).toContain("Something went wrong");
    expect(html).not.toContain("secret detail");
  });
});

describe("root document", () => {
  const document = () =>
    renderToStaticMarkup(createElement(Layout, { children: null }));

  it("declares the es-AR language", () => {
    expect(document()).toContain('<html lang="es-AR">');
  });

  it("sets theme-color to the sand-200 token value", () => {
    const tokens = parseColorTokens(
      readFileSync(new URL("./ui/styles/tokens.css", import.meta.url), "utf-8"),
    );
    const sand = tokens.get("sand-200") ?? "missing sand-200 token";

    expect(sand).toMatch(/^#[0-9a-f]{6}$/i);
    expect(document()).toContain(
      `<meta name="theme-color" content="${sand}"/>`,
    );
  });
});

describe("root links", () => {
  const entries = () => links();

  it("preloads the two above-the-fold fonts anonymously", () => {
    const preloads = entries().filter(
      (link) => "rel" in link && link.rel === "preload",
    );

    expect(preloads.map((link) => "href" in link && link.href)).toEqual([
      "/fonts/cormorant-garamond-latin-400-normal.woff2",
      "/fonts/montserrat-latin-400-normal.woff2",
    ]);
    for (const link of preloads) {
      expect(link).toMatchObject({
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      });
    }
  });

  it("links the processed stylesheet", () => {
    const sheets = entries().filter(
      (link) => "rel" in link && link.rel === "stylesheet",
    );

    expect(sheets).toHaveLength(1);
    expect(sheets[0]).toMatchObject({ href: "/assets/app.css" });
  });

  it("includes the stand-in favicon", () => {
    expect(entries()).toContainEqual({
      rel: "icon",
      href: "/media/stand-ins/favicon.png",
    });
  });

  it("only points at same-origin urls", () => {
    for (const link of entries()) {
      const href = "href" in link ? link.href : undefined;
      expect(href, "link without href").toBeTypeOf("string");
      expect(href).toMatch(/^\/(?!\/)/);
    }
  });
});
