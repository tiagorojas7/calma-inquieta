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

  it("shows finished steps with a check, the current one filled and the rest outlined, never by colour alone", () => {
    render(
      <StepIndicator
        steps={["Tus datos", "Materiales", "Pedido"]}
        current={2}
      />,
    );
    const items = screen.getAllByRole("listitem");

    expect(items.map((item) => item.getAttribute("data-state"))).toEqual([
      "done",
      "current",
      "todo",
    ]);
    // A finished step carries a check and says so to a screen reader.
    expect(items[0]?.querySelector("svg")).not.toBeNull();
    expect(items[0]).toHaveTextContent("completado");
    expect(items[1]?.querySelector("svg")).toBeNull();
    expect(items[2]?.querySelector("svg")).toBeNull();
    expect(items[0]?.querySelector("[aria-hidden='true']")).toHaveClass(
      "bg-sage-200",
      "text-olive-800",
    );
    expect(items[1]?.querySelector("[aria-hidden='true']")).toHaveClass(
      "bg-clay-600",
      "text-white",
    );
    expect(items[2]?.querySelector("[aria-hidden='true']")).toHaveClass(
      "border-clay-600",
    );
  });

  it("names only the current step on a phone, so the steps stay on one line", () => {
    render(
      <StepIndicator
        steps={["Tus datos", "Materiales", "Pedido"]}
        current={2}
      />,
    );

    expect(screen.getByText("Materiales")).not.toHaveClass("sr-only");
    for (const name of ["Tus datos", "Pedido"]) {
      expect(screen.getByText(name)).toHaveClass("sr-only", "sm:not-sr-only");
    }
    expect(screen.getByRole("list")).toHaveClass("flex-nowrap", "sm:flex-wrap");
  });

  it("joins the steps with a rule that fills in as they are finished, and ends after the last one", () => {
    render(
      <StepIndicator
        steps={["Tus datos", "Materiales", "Pedido"]}
        current={2}
      />,
    );
    const items = screen.getAllByRole("listitem");

    expect(items[0]?.querySelector("[data-connector]")).toHaveClass(
      "bg-clay-600",
    );
    expect(items[1]?.querySelector("[data-connector]")).toHaveClass(
      "bg-tan-400",
    );
    expect(items[2]?.querySelector("[data-connector]")).toBeNull();
  });
});
