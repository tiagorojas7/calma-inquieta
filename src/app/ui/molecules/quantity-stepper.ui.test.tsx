import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { QuantityStepper } from "./quantity-stepper";

function setup(value = 2, onChange = vi.fn()) {
  const view = render(
    <QuantityStepper
      label="Arcilla Grande"
      value={value}
      min={1}
      max={20}
      onChange={onChange}
    />,
  );
  return { ...view, onChange };
}

describe("QuantityStepper (M03, M05)", () => {
  it("steps down and up through 44 px buttons", () => {
    const { onChange } = setup(2);
    const down = screen.getByRole("button", {
      name: "Disminuir cantidad de Arcilla Grande",
    });
    const up = screen.getByRole("button", {
      name: "Aumentar cantidad de Arcilla Grande",
    });
    expect(down.className).toContain("size-11");
    expect(up.className).toContain("size-11");
    fireEvent.click(down);
    fireEvent.click(up);
    expect(onChange).toHaveBeenNthCalledWith(1, 1);
    expect(onChange).toHaveBeenNthCalledWith(2, 3);
  });

  it("keeps direct numeric entry with a 44 px tall field", () => {
    const { onChange } = setup(2);
    const input = screen.getByLabelText("Cantidad para Arcilla Grande");
    expect(input).toHaveValue(2);
    expect(input.className).toContain("min-h-11");
    fireEvent.change(input, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("disables the decrement at the minimum and the increment at the maximum", () => {
    const { rerender } = setup(1);
    expect(screen.getByRole("button", { name: /Disminuir/ })).toBeDisabled();
    rerender(
      <QuantityStepper
        label="Arcilla Grande"
        value={20}
        min={1}
        max={20}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Aumentar/ })).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    await expectNoAxeViolations(container);
  });
});
