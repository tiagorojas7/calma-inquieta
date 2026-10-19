import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PaperNote } from "./paper-note";

describe("PaperNote", () => {
  it("is a kraft paper card with the text in the script face", () => {
    const { container } = render(
      <PaperNote>Crear también es una forma de volver a vos</PaperNote>,
    );
    const note = container.firstElementChild;
    const text = screen.getByText("Crear también es una forma de volver a vos");

    expect(container.querySelector(".paper-torn")).toHaveClass("bg-sand-300");
    expect(note).toHaveClass("drop-shadow-md");
    expect(text).toHaveAttribute("data-script", "true");
    expect(text).toHaveClass("font-script", "text-ink-900");
  });

  it("is slightly rotated and takes a placement class", () => {
    const { container } = render(
      <PaperNote tilt="right" className="absolute">
        Hola
      </PaperNote>,
    );

    expect(container.firstElementChild).toHaveClass("rotate-3", "absolute");
  });

  it("defaults to a left tilt", () => {
    const { container } = render(<PaperNote>Hola</PaperNote>);

    expect(container.firstElementChild).toHaveClass("-rotate-3");
  });

  it("has no axe violations", async () => {
    const { container } = render(<PaperNote>Hola</PaperNote>);

    await expectNoAxeViolations(container);
  });
});
