import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminShell } from "./admin-shell";

const SECTIONS = [
  ["Hoy", "/admin"],
  ["Alumnas", "/admin/alumnas"],
  ["Clases", "/admin/clases"],
  ["Materiales", "/admin/materiales"],
  ["Ajustes", "/admin/ajustes"],
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
    // One line: the email shares the bar with Salir, not a row of its own.
    expect(desktopIdentity.parentElement).toBe(
      screen.getByTestId("admin-actions").parentElement,
    );
  });

  it("shows the email and Salir, lists the five sections and marks the active one", async () => {
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
    expect(entries(sidebar)).toEqual(SECTIONS);
    const current = within(sidebar)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Ajustes"]);

    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const mobile = screen.getByRole("navigation", {
      name: "Menú de secciones",
    });
    expect(entries(mobile)).toEqual(entries(sidebar));
    // Public chrome never renders inside the admin.
    expect(screen.queryByRole("link", { name: "Escribinos" })).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("has no Más group: the five sections are all there is", () => {
    const { container } = render(
      <AdminShell email={null} pathname="/admin/alumnas">
        <h1>Alumnas</h1>
      </AdminShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(sidebar.querySelector("details")).toBeNull();
    expect(container.querySelectorAll("details").length).toBe(0);
    expect(within(sidebar).getAllByRole("link")).toHaveLength(5);
  });

  it.each([
    ["/admin/talleres/w1", "Clases"],
    ["/admin/profesores/p1", "Ajustes"],
    ["/admin/materiales/proveedores/s1", "Ajustes"],
    ["/admin/materiales/m1", "Materiales"],
    ["/admin/inscripciones/materiales", "Materiales"],
  ])("highlights the section of the deep page %s", (pathname, label) => {
    render(
      <AdminShell email={null} pathname={pathname}>
        <h1>Página</h1>
      </AdminShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      within(sidebar)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page")
        .map((link) => link.textContent),
    ).toEqual([label]);
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

  it("stretches the sidebar to the bottom of the screen on short pages", () => {
    const { container } = render(
      <AdminShell email={null} pathname="/admin">
        <h1>Inicio</h1>
      </AdminShell>,
    );
    const root = container.firstElementChild;
    const body = screen.getByRole("main").parentElement;

    expect(root).toHaveClass("flex", "flex-col");
    expect(body).toHaveClass("lg:flex", "flex-1");
  });
});

describe("AdminShell wayfinding", () => {
  it("draws one decorative area icon before every nav label and tints the active entry", () => {
    render(
      <AdminShell email={null} pathname="/admin/talleres/t1">
        <h1>Taller</h1>
      </AdminShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    const links = within(sidebar).getAllByRole("link");
    expect(links).toHaveLength(5);
    for (const link of links) {
      const icon = link.querySelector("svg");
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(link).toHaveClass("min-h-12");
    }
    const active = links.find(
      (link) => link.getAttribute("aria-current") === "page",
    ) as HTMLElement;
    expect(active).toHaveAttribute("data-area", "workshops");
    expect(active).toHaveClass(
      "bg-area-workshops-bg",
      "text-area-workshops-fg",
    );
  });

  it("keeps Salir a 44 px target", () => {
    render(
      <AdminShell email={null} pathname="/admin">
        <h1>Inicio</h1>
      </AdminShell>,
    );
    expect(screen.getByRole("link", { name: "Salir" })).toHaveClass("min-h-11");
  });
});

describe("AdminShell notification bell", () => {
  const shell = (unseen?: number | null) =>
    render(
      <AdminShell
        email="agus@example.com"
        pathname="/admin"
        {...(unseen === undefined ? {} : { unseen })}
      >
        <h1>Panel</h1>
      </AdminShell>,
    );

  it("links the bell to the novelties from the action group, with the count in its name and a visible badge", () => {
    const { container } = shell(3);

    const bell = screen.getByRole("link", { name: "Novedades: 3 sin leer" });
    expect(bell).toHaveAttribute("href", "/admin/novedades");
    expect(screen.getByTestId("admin-actions")).toContainElement(bell);
    expect(bell).toHaveClass("min-h-11", "min-w-11");
    expect(screen.getByTestId("admin-bell-badge")).toHaveTextContent("3");
    expect(bell.outerHTML).not.toMatch(/gradient/);
    expect(container.innerHTML).not.toMatch(/gradient/);
  });

  it("reads one unread in the singular and caps the badge text at 99+ without hiding the real count", () => {
    shell(1);
    expect(
      screen.getByRole("link", { name: "Novedades: 1 sin leer" }),
    ).toBeVisible();
    shell(140);
    expect(
      screen.getByRole("link", { name: "Novedades: 140 sin leer" }),
    ).toBeVisible();
    expect(screen.getByText("99+")).toBeVisible();
  });

  it.each([
    ["zero", 0],
    ["unknown", null],
    ["omitted", undefined],
  ] as const)(
    "shows the bell with no badge when the count is %s",
    (_name, value) => {
      shell(value);

      expect(screen.getByRole("link", { name: "Novedades" })).toHaveAttribute(
        "href",
        "/admin/novedades",
      );
      expect(screen.queryByTestId("admin-bell-badge")).toBeNull();
    },
  );

  it("keeps the same navigation entries and Salir next to the bell", async () => {
    shell(2);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.getByRole("link", { name: "Salir" })).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "Menú de secciones" }),
      ).queryByRole("link", { name: /Novedades/ }),
    ).toBeNull();
  });
});
