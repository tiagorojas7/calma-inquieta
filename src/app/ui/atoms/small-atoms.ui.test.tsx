import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Divider, Pill, SkipLink, VisuallyHidden } from "./small-atoms";

describe("small atoms", () => {
  it("renders labels and accessible hidden text", () => {
    render(
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
  });
});
