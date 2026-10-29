import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { StepIndicator } from "./step-indicator";

describe("StepIndicator (EN05)", () => {
  it("states the position in words and marks the current step", async () => {
    const { container } = render(
      <StepIndicator
        steps={["Tus datos", "Materiales", "Pedido"]}
        current={2}
      />,
    );
    expect(screen.getByText("Paso 2 de 3")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
    await expectNoAxeViolations(container);
  });
});
