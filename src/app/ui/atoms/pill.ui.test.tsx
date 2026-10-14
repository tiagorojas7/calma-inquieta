import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Pill } from "./pill";

describe("Pill", () => {
  it("is neutral by default", async () => {
    const { container } = render(<Pill>Materiales incluidos</Pill>);
    expect(screen.getByText("Materiales incluidos")).toHaveAttribute(
      "data-tone",
      "neutral",
    );
    await expectNoAxeViolations(container);
  });

  it("renders the notice tone", async () => {
    const { container } = render(<Pill tone="notice">Pausado</Pill>);
    expect(screen.getByText("Pausado")).toHaveAttribute("data-tone", "notice");
    await expectNoAxeViolations(container);
  });
});
