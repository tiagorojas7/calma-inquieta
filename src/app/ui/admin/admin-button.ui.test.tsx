import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";

describe("AdminButton", () => {
  it("is the strong primary action by default", () => {
    render(<AdminButton type="submit">Guardar</AdminButton>);
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("treats outline as the secondary alias", () => {
    render(<AdminButton variant="outline">Volver</AdminButton>);
    expect(screen.getByRole("button", { name: "Volver" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("offers a danger variant for delete and cancel", () => {
    render(<AdminButton variant="danger">Eliminar</AdminButton>);
    expect(screen.getByRole("button", { name: "Eliminar" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("disables itself and flags busy while loading", () => {
    render(<AdminButton loading>Guardar</AdminButton>);
    const button = screen.getByRole("button", { name: /Guardar/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("passes native attributes through", async () => {
    const { container } = render(
      <AdminButton data-cancel type="button" aria-label="Cerrar">
        x
      </AdminButton>,
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveAttribute(
      "data-cancel",
    );
    await expectNoAxeViolations(container);
  });
});

describe("AdminButtonLink variants", () => {
  it.each([
    ["primary", "primary"],
    ["outline", "secondary"],
    ["secondary", "secondary"],
    ["danger", "danger"],
  ] as const)("marks %s as %s", (variant, expected) => {
    render(
      <AdminButtonLink href="/admin/x" variant={variant}>
        Ir
      </AdminButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Ir" });
    expect(link).toHaveAttribute("data-variant", expected);
    expect(link).toHaveAttribute("href", "/admin/x");
  });
});

describe("AdminButtonLink icons", () => {
  it("shows a decorative leading icon and a trailing arrow for next steps", () => {
    render(
      <AdminButtonLink href="/admin/talleres/nuevo" icon="workshops" next>
        Nuevo taller
      </AdminButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Nuevo taller" });
    const icons = link.querySelectorAll("svg");
    expect(icons).toHaveLength(2);
    for (const icon of icons)
      expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(link).toHaveClass("min-h-12");
  });
});
