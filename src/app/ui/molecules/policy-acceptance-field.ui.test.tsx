import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PolicyAcceptanceField } from "./policy-acceptance-field";

const versions = { conditionsVersion: 2, privacyVersion: 3 };

describe("PolicyAcceptanceField", () => {
  it("is one checkbox that reads the agreed sentence", () => {
    const { container } = render(<PolicyAcceptanceField versions={versions} />);
    const checkbox = screen.getByRole("checkbox", {
      name: "Leí y acepto las condiciones y la política de privacidad",
    });
    expect(checkbox).toHaveAttribute("name", "policy");
    expect(checkbox).toBeRequired();
    expect(checkbox).not.toBeChecked();
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      1,
    );
  });

  it("links each document, opening a new tab safely", () => {
    render(<PolicyAcceptanceField versions={versions} />);
    for (const [name, href] of [
      ["las condiciones", "/condiciones"],
      ["la política de privacidad", "/privacidad"],
    ] as const) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("posts the versions it showed as hidden fields", () => {
    const { container } = render(<PolicyAcceptanceField versions={versions} />);
    expect(
      container.querySelector('input[name="conditionsVersion"]'),
    ).toHaveAttribute("value", "2");
    expect(
      container.querySelector('input[name="privacyVersion"]'),
    ).toHaveAttribute("value", "3");
    expect(
      container.querySelector('input[name="conditionsVersion"]'),
    ).toHaveAttribute("type", "hidden");
  });

  it("posts no versions when they could not be read, and still renders the checkbox and links", () => {
    const { container } = render(<PolicyAcceptanceField versions={null} />);
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("shows the error next to the checkbox", () => {
    render(
      <PolicyAcceptanceField
        versions={versions}
        error="Las condiciones cambiaron. Volvé a leerlas y aceptalas."
      />,
    );
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription(
      "Las condiciones cambiaron. Volvé a leerlas y aceptalas.",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PolicyAcceptanceField versions={versions} />);
    await expectNoAxeViolations(container);
  });
});
