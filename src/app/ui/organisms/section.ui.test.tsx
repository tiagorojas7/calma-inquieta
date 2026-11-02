import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { contrastRatio, parseColorTokens } from "../tokens/contrast";
import { Section } from "./section";

const tokens = parseColorTokens(
  readFileSync(join(process.cwd(), "src/app/ui/styles/tokens.css"), "utf-8"),
);
const color = (name: string) => tokens.get(name) ?? `missing ${name}`;

describe("Section tones", () => {
  it.each([
    ["canvas", ["bg-canvas", "text-ink-700"]],
    ["sand", ["bg-sand-100", "text-ink-700"]],
    ["clay", ["bg-clay-800", "text-canvas", "tone-clay"]],
    ["cocoa", ["bg-cocoa-900", "text-canvas", "tone-cocoa"]],
    ["white", ["bg-surface", "text-ink-700"]],
  ] as const)("tone %s sets its band colours", (tone, classes) => {
    render(
      <Section tone={tone} aria-label="Banda">
        <p>Contenido</p>
      </Section>,
    );

    const band = screen.getByRole("region", { name: "Banda" });
    expect(band).toHaveClass(...classes);
    expect(band).toHaveAttribute("data-tone", tone);
  });

  it("defaults to the canvas tone", () => {
    render(<Section aria-label="Banda">Contenido</Section>);

    expect(screen.getByRole("region")).toHaveAttribute("data-tone", "canvas");
  });

  it("keeps AA text contrast on every tone", () => {
    const pairs: [string, string][] = [
      ["ink-700", "canvas"],
      ["ink-700", "sand-100"],
      ["ink-700", "surface"],
      ["canvas", "clay-800"],
      ["sand-200", "clay-800"],
      ["white", "clay-800"],
    ];
    for (const [fg, bg] of pairs) {
      expect(
        contrastRatio(color(fg), color(bg)),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("Section bleed and alignment", () => {
  it("a boxed band keeps to the page grid and rounds its corners", () => {
    render(
      <Section tone="sand" aria-label="Banda">
        <p>Contenido</p>
      </Section>,
    );

    const band = screen.getByRole("region");
    expect(band).toHaveAttribute("data-bleed", "false");
    expect(band).not.toHaveClass("section-bleed");
    expect(band).toHaveClass("rounded-md");
  });

  it("a bleed band escapes the page wrapper and aligns its content to the grid", () => {
    render(
      <Section tone="clay" bleed aria-label="Banda">
        <p>Contenido</p>
      </Section>,
    );

    const band = screen.getByRole("region");
    expect(band).toHaveAttribute("data-bleed", "true");
    expect(band).toHaveClass("section-bleed");
    expect(band).not.toHaveClass("rounded-md");
    const inner = screen.getByText("Contenido").parentElement;
    expect(inner).toHaveClass("mx-auto", "w-full", "max-w-page", "px-gutter");
  });
});

describe("Section spacing and grain", () => {
  it.each([
    ["none", "py-0"],
    ["sm", "py-10"],
    ["md", "py-section"],
    ["lg", "py-16"],
  ] as const)("spacing %s applies %s", (spacing, utility) => {
    render(
      <Section spacing={spacing} aria-label="Banda">
        Contenido
      </Section>,
    );

    expect(screen.getByRole("region")).toHaveClass(utility);
  });

  it("defaults to md spacing and no grain", () => {
    render(<Section aria-label="Banda">Contenido</Section>);

    const band = screen.getByRole("region");
    expect(band).toHaveClass("py-section");
    expect(band).not.toHaveClass("paper-grain");
  });

  it("adds the paper grain only when asked", () => {
    render(
      <Section grain aria-label="Banda">
        Contenido
      </Section>,
    );

    expect(screen.getByRole("region")).toHaveClass("paper-grain");
  });
});

describe("Section markup", () => {
  it("renders another element, merges className and passes attributes", async () => {
    const { container } = render(
      <Section as="div" id="banda" className="mt-4">
        <h2>Título</h2>
      </Section>,
    );

    const band = container.firstElementChild;
    expect(band?.tagName).toBe("DIV");
    expect(band).toHaveClass("mt-4");
    expect(band).toHaveAttribute("id", "banda");
    await expectNoAxeViolations(container);
  });
});
