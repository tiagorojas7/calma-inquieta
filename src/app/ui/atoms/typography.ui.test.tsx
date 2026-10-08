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
    expect(screen.getByText("Sección")).toHaveAttribute("data-eyebrow", "true");
  });
  it("has an accessible heading outline", () => {
    const { container } = render(<Heading level={1}>Título</Heading>);
    expectNoAxeViolations(container);
  });
});
