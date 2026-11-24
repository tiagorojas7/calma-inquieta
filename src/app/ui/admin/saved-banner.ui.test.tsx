import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { SavedBanner } from "./saved-banner";

describe("SavedBanner", () => {
  it("names what was saved in a status region", async () => {
    const { container } = render(<SavedBanner message="Cobro de Ana" />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Guardado");
    expect(banner).toHaveTextContent("Cobro de Ana");
    await expectNoAxeViolations(container);
  });

  it("stays visible at the top of the page while it scrolls", () => {
    render(<SavedBanner message="Seña de Carla" />);
    expect(screen.getByRole("status")).toHaveClass("sticky", "top-2");
  });

  it("draws nothing when there is nothing to say", () => {
    const { container } = render(<SavedBanner message={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("uses solid colors, with no gradient", () => {
    const { container } = render(<SavedBanner message="Cobro de Ana" />);
    expect(container.innerHTML).not.toMatch(/gradient/);
  });
});
