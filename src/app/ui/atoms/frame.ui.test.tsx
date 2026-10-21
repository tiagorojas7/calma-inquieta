import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Frame } from "./frame";

describe("Frame", () => {
  it("wraps its child in a white photo border with a soft shadow", () => {
    const { container } = render(
      <Frame>
        <img src="/a.webp" alt="Foto" width={4} height={3} />
      </Frame>,
    );
    const frame = container.firstElementChild;

    expect(frame).toHaveClass("bg-surface", "shadow-lift");
    expect(frame?.className).toMatch(/\bp-\d/);
    expect(screen.getByRole("img", { name: "Foto" }).parentElement).toBe(frame);
  });

  it("tilts only when asked and takes a placement class", () => {
    const { container, rerender } = render(<Frame>x</Frame>);
    expect(container.firstElementChild?.className).not.toMatch(/rotate/);

    rerender(
      <Frame tilt="left" className="absolute">
        x
      </Frame>,
    );
    expect(container.firstElementChild).toHaveClass("-rotate-2", "absolute");

    rerender(<Frame tilt="right">x</Frame>);
    expect(container.firstElementChild).toHaveClass("rotate-2");
  });
});
