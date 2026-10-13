import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Divider, Pill, SkipLink, VisuallyHidden } from "./small-atoms";

describe("small atoms", () => {
  it("renders labels and accessible hidden text", async () => {
    const { container } = render(
      <>
        <Pill>Nuevo</Pill>
        <Divider />
        <VisuallyHidden>Ayuda</VisuallyHidden>
        <SkipLink inert />
      </>,
    );
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(screen.getByText("Ayuda")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "#contenido");
    expect(screen.getByRole("link")).toHaveAttribute("inert");
    expect(screen.getByRole("presentation")).toHaveClass("border-tan-400");
    expect(screen.getByText("Ayuda")).toHaveClass("sr-only");
    expect(screen.getByRole("link")).toHaveClass(
      "sr-only",
      "focus:not-sr-only",
      "focus:bg-canvas",
    );
    await expectNoAxeViolations(container);
  });
});
