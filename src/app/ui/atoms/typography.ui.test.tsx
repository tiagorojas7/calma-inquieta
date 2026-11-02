import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Heading } from "./heading";
import { Text } from "./text";
import { Eyebrow } from "./eyebrow";

describe("typography atoms", () => {
  it("decouples heading level and size", () => {
    render(
      <Heading level={3} size="display">
        Título
      </Heading>,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveAttribute(
      "data-size",
      "display",
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveClass(
      "text-display",
      "text-ink-900",
    );
  });
  it.each([
    ["display", "text-display"],
    ["h1", "text-display"],
    ["h2", "text-h2"],
    ["h3", "text-h3"],
    ["h4", "text-base"],
  ] as const)("maps heading size %s to the custom scale", (size, token) => {
    render(
      <Heading level={2} size={size}>
        Título
      </Heading>,
    );
    expect(screen.getByRole("heading")).toHaveClass(token, "text-ink-900");
  });

  it.each([
    ["display", "font-semibold"],
    ["h1", "font-semibold"],
    ["h2", "font-semibold"],
    ["h3", "font-semibold"],
  ] as const)("gives heading size %s the weight %s", (size, weight) => {
    render(
      <Heading level={2} size={size}>
        Título
      </Heading>,
    );
    expect(screen.getByRole("heading")).toHaveClass("font-display", weight);
    expect(screen.getByRole("heading")).not.toHaveClass("leading-tight");
  });

  it("keeps the mixed roman and italic heading text in the DOM as <em>", () => {
    render(
      <Heading level={1}>
        Calma <em>inquieta</em>
      </Heading>,
    );
    expect(screen.getByText("inquieta").tagName).toBe("EM");
  });

  it.each([
    ["default", "text-ink-700"],
    ["muted", "text-ink-600"],
    ["accent", "text-clay-800"],
  ] as const)("maps text tone %s to the authoritative color", (tone, token) => {
    render(<Text tone={tone}>Texto</Text>);
    expect(screen.getByText("Texto")).toHaveClass("text-base", token);
  });

  it("renders text tones and eyebrow", () => {
    render(
      <>
        <Text as="span" tone="muted">
          Texto
        </Text>
        <Eyebrow>Sección</Eyebrow>
      </>,
    );
    expect(screen.getByText("Texto")).toHaveAttribute("data-tone", "muted");
    expect(screen.getByText("Texto")).toHaveClass("text-base");
    expect(screen.getByText("Sección")).toHaveAttribute("data-eyebrow", "true");
    expect(screen.getByText("Sección")).toHaveClass(
      "text-eyebrow",
      "tracking-eyebrow",
      "text-terracotta-700",
    );
  });
  it("has an accessible heading outline", async () => {
    const { container } = render(<Heading level={1}>Título</Heading>);
    await expectNoAxeViolations(container);
  });
});
