import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PriceTag } from "./price-tag";

describe("PriceTag", () => {
  it("renders the amount with its suffix", async () => {
    const { container } = render(<PriceTag amount="$ 58.000" suffix="/ mes" />);
    expect(screen.getByText("$ 58.000 / mes")).toBeInTheDocument();
    expect(screen.queryByText("Cuota mensual")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("renders the label and an amount without suffix", async () => {
    const { container } = render(
      <PriceTag label="Cuota mensual" amount="$ 45.000" />,
    );
    expect(screen.getByText("Cuota mensual")).toBeInTheDocument();
    expect(screen.getByText("$ 45.000")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
