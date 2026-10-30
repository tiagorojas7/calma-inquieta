import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminShell } from "./admin-shell";

const MAIN = [
  ["Inicio", "/admin"],
  ["Inscripciones", "/admin/inscripciones"],
  ["Talleres", "/admin/talleres"],
  ["Intensivos", "/admin/intensivos"],
  ["Materiales", "/admin/inscripciones/materiales"],
  ["Asistencia", "/admin/asistencia"],
];
const MORE = [
  ["Profesoras", "/admin/profesores"],
  ["Proveedores", "/admin/materiales/proveedores"],
  ["Alumnas", "/admin/alumnas"],
  ["Eventos privados", "/admin/eventos"],
  ["Recordatorios", "/admin/recordatorios"],
  ["Estadísticas", "/admin/estadisticas"],
  ["Catálogo de materiales", "/admin/materiales"],
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

  it("shows the email and Salir, lists the short menu and marks the active one", async () => {
    const { container } = render(
      <AdminShell
        email="agus@example.com"
        pathname="/admin/materiales/proveedores/s1"
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
    expect(entries(sidebar)).toEqual([...MAIN, ...MORE]);
    const current = within(sidebar)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Proveedores"]);

    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const mobile = screen.getByRole("navigation", {
      name: "Menú de secciones",
    });
    expect(entries(mobile)).toEqual(entries(sidebar));
    // Public chrome never renders inside the admin.
    expect(screen.queryByRole("link", { name: "Escribinos" })).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("puts the secondary areas in a native Más disclosure that opens on its own pages", () => {
    const { container, rerender } = render(
      <AdminShell email={null} pathname="/admin/alumnas">
        <h1>Alumnas</h1>
      </AdminShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    const details = sidebar.querySelector("details") as HTMLDetailsElement;
    expect(details.querySelector("summary")).toHaveTextContent("Más");
    expect(details.open).toBe(true);
    expect(
      within(details)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(MORE.map(([label]) => label));
    // The main entries stay outside the disclosure.
    expect(
      within(details).queryByRole("link", { name: "Talleres" }),
    ).toBeNull();
    expect(container.querySelectorAll("details[data-more]").length).toBe(1);

    rerender(
      <AdminShell email={null} pathname="/admin/talleres">
        <h1>Talleres</h1>
      </AdminShell>,
    );
    expect(
      (
        screen
          .getByRole("navigation", { name: "Secciones" })
          .querySelector("details") as HTMLDetailsElement
      ).open,
    ).toBe(false);
  });

  it("marks Materiales, not Inscripciones, on the materials screen", () => {
    render(
      <AdminShell email={null} pathname="/admin/inscripciones/materiales">
        <h1>Materiales</h1>
      </AdminShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      within(sidebar)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page")
        .map((link) => link.textContent),
    ).toEqual(["Materiales"]);
  });

  it("paints the page grey so white cards stand out", () => {
    const { container } = render(
      <AdminShell email={null} pathname="/admin">
        <h1>Inicio</h1>
      </AdminShell>,
    );
    expect(container.firstElementChild).toHaveClass(
      "admin-root",
      "bg-admin-page",
    );
  });
});
