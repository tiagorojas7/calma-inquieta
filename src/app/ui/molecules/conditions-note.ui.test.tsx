import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ConditionsNote } from "./conditions-note";

describe("ConditionsNote", () => {
  it("shows the policy text always visible, with no collapsed details", async () => {
    const { container } = render(
      <ConditionsNote
        label="Condiciones"
        policyText="La seña no se devuelve."
        minSeats="Se realiza con un mínimo de 4 personas"
      />,
    );
    expect(screen.getByText("Condiciones")).toBeVisible();
    expect(screen.getByText("La seña no se devuelve.")).toBeVisible();
    expect(
      screen.getByText("Se realiza con un mínimo de 4 personas"),
    ).toBeVisible();
    expect(container.querySelector("details")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("renders markup in the policy text literally and keeps line breaks", async () => {
    const { container } = render(
      <ConditionsNote
        label="Condiciones"
        policyText={"Línea uno <b>negrita</b>\nLínea dos"}
      />,
    );
    const policy = screen.getByText(/Línea uno/u);
    expect(policy.textContent).toBe("Línea uno <b>negrita</b>\nLínea dos");
    expect(container.querySelector("b")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("omits the minimum seats line when minSeats is absent", async () => {
    const { container } = render(
      <ConditionsNote
        label="Condiciones"
        policyText="La seña no se devuelve."
      />,
    );
    expect(screen.getByText("La seña no se devuelve.")).toBeVisible();
    expect(container.textContent).not.toContain("mínimo");
    await expectNoAxeViolations(container);
  });
});
