import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Section } from "./organisms/section";

const tokens = readFileSync("src/app/ui/styles/tokens.css", "utf8");

/** Page templates: the first thing under the navbar is their title. */
const TEMPLATES = [
  "catalog-listing-page",
  "private-event-page",
  "taller-detail-page",
  "intensivo-detail-page",
  "order-page",
  "enrollment-page",
  "enrollment-materials-page",
  "intensivo-request-page",
  "intensivo-request-summary-page",
  "error-page",
  "coming-soon-page",
] as const;

describe("space between the navbar and a page title", () => {
  it("defines a page-top token that is much smaller than the section rhythm", () => {
    const top = tokens.match(
      /--spacing-page-top:\s*clamp\(\s*([\d.]+)rem,\s*[^,]+,\s*([\d.]+)rem\s*\)/,
    );
    const section = tokens.match(
      /--spacing-section:\s*clamp\(\s*([\d.]+)rem,\s*[^,]+,\s*([\d.]+)rem\s*\)/,
    );

    expect(top).not.toBeNull();
    expect(section).not.toBeNull();
    // 24 px on phones to 48 px on desktop, against 48 to 96 px for sections.
    expect(Number(top?.[1])).toBeLessThanOrEqual(1.5);
    expect(Number(top?.[2])).toBeLessThanOrEqual(3);
    expect(Number(top?.[2])).toBeLessThan(Number(section?.[2]));
  });

  it("offers a page spacing for the first band of a page: close above, the usual space below", () => {
    const html = renderToStaticMarkup(
      createElement(Section, { spacing: "page" }, "x"),
    );

    expect(html).toContain("pt-page-top");
    expect(html).toContain("pb-16");
    expect(html).toContain("lg:pb-28");
    expect(html).not.toMatch(/\bpy-16\b/);
  });

  it.each(["about-intro", "contact-section"])(
    "%s opens with the page spacing, not the symmetric section one",
    (name) => {
      const source = readFileSync(`src/app/ui/organisms/${name}.tsx`, "utf8");

      expect(source).toContain('spacing="page"');
      expect(source).not.toContain('spacing="lg"');
    },
  );

  it.each(TEMPLATES)(
    "%s keeps the small page-top and the section rhythm only below",
    (name) => {
      const source = readFileSync(`src/app/ui/templates/${name}.tsx`, "utf8");

      expect(source).toContain("pt-page-top");
      expect(source).toContain("pb-section");
      expect(source).not.toMatch(/\bpy-section\b/);
    },
  );
});
