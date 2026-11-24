import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminSettingsHub } from "./settings-hub";

const CARDS = [
  ["Profesoras", "/admin/profesores"],
  ["Proveedores", "/admin/materiales/proveedores"],
  ["Políticas", "/admin/politicas"],
  ["Estadísticas y planillas", "/admin/estadisticas"],
  ["Eventos privados", "/admin/eventos"],
  ["Recordatorios", "/admin/recordatorios"],
  ["Inscripciones", "/admin/inscripciones"],
];

describe("AdminSettingsHub", () => {
  it("links to every former entry that is not one of the four sections", async () => {
    const { container } = render(<AdminSettingsHub />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Ajustes" }),
    ).toBeVisible();
    const list = screen.getByRole("list", { name: "Ajustes" });
    const links = within(list).getAllByRole("link");
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(CARDS);
    await expectNoAxeViolations(container);
  });

  it("keeps each card to a title and a few words", () => {
    render(<AdminSettingsHub />);
    const items = within(
      screen.getByRole("list", { name: "Ajustes" }),
    ).getAllByRole("listitem");
    for (const item of items) {
      const words = item.textContent.trim().split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(8);
      expect(item.textContent).not.toMatch(/[.]/);
    }
  });
});

describe("AdminSettingsHub desktop width", () => {
  it("spreads the cards over three columns on a desktop", () => {
    render(<AdminSettingsHub />);
    expect(screen.getByRole("list", { name: "Ajustes" })).toHaveClass(
      "sm:grid-cols-2",
      "lg:grid-cols-3",
    );
  });
});
