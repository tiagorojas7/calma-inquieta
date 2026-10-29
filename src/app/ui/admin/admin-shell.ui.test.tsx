import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminShell } from "./admin-shell";

const EXPECTED = [
  ["Talleres", "/admin/talleres"],
  ["Intensivos", "/admin/intensivos"],
  ["Profesores", "/admin/profesores"],
  ["Inscripciones", "/admin/inscripciones"],
  ["Alumnas", "/admin/alumnas"],
  ["Asistencia", "/admin/asistencia"],
  ["Materiales", "/admin/materiales"],
  ["Eventos privados", "/admin/eventos"],
  ["Estadísticas", "/admin/estadisticas"],
  ["Recordatorios", "/admin/recordatorios"],
];

function entries(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);
}

describe("AdminShell", () => {
  it("keeps a long account identity out of the action row and exposes it in the mobile menu", async () => {
    const email =
      "owner-with-a-very-long-email-address-that-must-wrap@example.com";
    render(
      <AdminShell email={email} pathname="/admin">
        <h1>Panel</h1>
      </AdminShell>,
    );

    expect(screen.getByTestId("admin-actions")).not.toHaveTextContent(email);
    expect(screen.getByTestId("admin-menu-button")).toHaveClass("min-w-11");
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const mobile = screen.getByRole("navigation", {
      name: "Menú de secciones",
    });
    expect(within(mobile).getByText(email)).toBeVisible();

    const desktopIdentity = screen.getByTestId("admin-desktop-identity");
    expect(desktopIdentity).toHaveTextContent(email);
    expect(desktopIdentity).toHaveClass("min-w-0", "break-all");
  });

  it("shows the email and Salir, lists the four areas and marks the active one", async () => {
    const { container } = render(
      <AdminShell
        email="agus@example.com"
        pathname="/admin/materiales/proveedores"
      >
        <h1>Proveedores</h1>
      </AdminShell>,
    );
    expect(screen.getAllByText("agus@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Salir" })).toHaveAttribute(
      "href",
      "/cdn-cgi/access/logout",
    );

    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(entries(sidebar)).toEqual(EXPECTED);
    const current = within(sidebar)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Materiales"]);

    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const mobile = screen.getByRole("navigation", {
      name: "Menú de secciones",
    });
    expect(entries(mobile)).toEqual(entries(sidebar));
    // Public chrome never renders inside the admin.
    expect(screen.queryByRole("link", { name: "Escribinos" })).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });
});
