import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminDeniedPage } from "./admin-denied-page";
import { AdminErrorState } from "./admin-error-state";
import { AdminLanding, type AdminPanelSummary } from "./admin-landing";

describe("AdminDeniedPage", () => {
  it("shows the denial message and the identity email, with no admin navigation", async () => {
    const { container } = render(<AdminDeniedPage email="mal@example.com" />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "No tenés acceso al panel",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/mal@example\.com/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("link", { name: "Talleres" })).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("offers to switch account and to ask for access on WhatsApp", () => {
    render(
      <AdminDeniedPage
        email="mal@example.com"
        whatsappHref="https://wa.me/549351?text=Hola"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Cerrar sesión y usar otra cuenta" }),
    ).toHaveAttribute("href", "/cdn-cgi/access/logout");
    expect(
      screen.getByRole("link", { name: "Pedir acceso por WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/549351?text=Hola");
  });

  it("omits the WhatsApp request when there is no link", () => {
    render(<AdminDeniedPage email={null} />);
    expect(
      screen.queryByRole("link", { name: "Pedir acceso por WhatsApp" }),
    ).toBeNull();
  });

  it("omits the email when none was verified", () => {
    render(<AdminDeniedPage email={null} />);
    expect(screen.queryByText(/Iniciaste sesión/)).toBeNull();
  });
});

const summary: AdminPanelSummary = {
  period: "2026-10",
  monthLabel: "octubre 2026",
  tasks: [
    {
      key: "charge",
      text: "3 inscripciones por cobrar",
      action: "Cobrar",
      hint: "Ver inscripciones por cobrar",
      href: "/admin/inscripciones?estado=pending_confirmation",
    },
    {
      key: "order",
      text: "Pedir materiales a Arcilla SA",
      action: "Ver pedido",
      hint: "Ver el pedido de materiales",
      href: "/admin/inscripciones/materiales",
    },
  ],
  figures: {
    collected: "$ 96.000",
    profit: "$ 63.000",
    teachers: "$ 27.000",
    occupancy: "39 %",
    occupancyDetail: "9 de 23 lugares",
  },
};

describe("AdminLanding", () => {
  it("lists what is due today in order, each with one button", async () => {
    const { container } = render(<AdminLanding summary={summary} />);
    expect(screen.getByText("Lo que necesita tu atención hoy.")).toBeVisible();
    expect(screen.queryByText(/agus@example.com/)).toBeNull();
    const today = screen
      .getByRole("heading", { name: "Hoy tenés que…" })
      .closest("section") as HTMLElement;
    const items = within(today).getAllByRole("listitem");
    expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual([
      "3 inscripciones por cobrar",
      "Pedir materiales a Arcilla SA",
    ]);
    for (const item of items)
      expect(within(item).getAllByRole("link")).toHaveLength(1);
    expect(
      within(items[0] as HTMLElement).getByRole("link", { name: /Cobrar/ }),
    ).toHaveAttribute(
      "href",
      "/admin/inscripciones?estado=pending_confirmation",
    );
    expect(
      within(items[1] as HTMLElement).getByRole("link", { name: /Ver pedido/ }),
    ).toHaveAttribute("href", "/admin/inscripciones/materiales");
    await expectNoAxeViolations(container);
  });

  it("groups today and the month on panels, and leaves the shortcuts to phones", () => {
    render(<AdminLanding summary={summary} />);

    expect(
      screen
        .getByRole("heading", { name: "Hoy tenés que…" })
        .closest("section"),
    ).toHaveClass("bg-surface", "shadow-card");
    expect(
      screen.getByRole("navigation", { name: "Áreas" }).closest("section"),
    ).toHaveClass("lg:hidden");
  });

  it("shows the four figures of the month and a link to the statistics", () => {
    render(<AdminLanding summary={summary} />);
    expect(
      screen.getByRole("heading", { name: "Tu mes: octubre 2026" }),
    ).toBeVisible();
    for (const text of [
      "Cobrado",
      "$ 96.000",
      "Ganancia del estudio",
      "$ 63.000",
      "Ocupación",
      "39 %",
      "9 de 23 lugares",
      "A pagar a profesoras",
      "$ 27.000",
    ])
      expect(screen.getByText(text)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver estadísticas" }),
    ).toHaveAttribute("href", "/admin/estadisticas?mes=2026-10");
  });

  it("offers one large tile per main area, each with its icon and a chevron", () => {
    render(<AdminLanding summary={summary} />);
    const nav = screen.getByRole("navigation", { name: "Áreas" });
    const links = within(nav).getAllByRole("link");
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Inscripciones", "/admin/inscripciones"],
      ["Talleres", "/admin/talleres"],
      ["Workshops", "/admin/intensivos"],
      ["Materiales", "/admin/inscripciones/materiales"],
      ["Asistencia", "/admin/asistencia"],
    ]);
    for (const link of links) {
      expect(link).toHaveClass("min-h-16");
      expect(link.querySelectorAll("svg")).toHaveLength(2);
      for (const icon of link.querySelectorAll("svg"))
        expect(icon).toHaveAttribute("aria-hidden", "true");
    }
    expect(links[1]).toHaveAttribute("data-area", "workshops");
  });

  it("says everything is up to date when nothing is due", () => {
    render(
      <AdminLanding
        email="agus@example.com"
        summary={{ ...summary, tasks: [] }}
      />,
    );
    expect(
      screen.getByText("Todo al día. No hay nada pendiente para hoy."),
    ).toBeVisible();
  });
});

describe("AdminErrorState", () => {
  it("offers to retry the same screen and to go back", () => {
    render(
      <AdminErrorState status={500} retryHref="/admin/inscripciones?q=a" />,
    );
    expect(screen.getByRole("link", { name: "Reintentar" })).toHaveAttribute(
      "href",
      "/admin/inscripciones?q=a",
    );
    expect(
      screen.getByRole("link", { name: "Volver al panel" }),
    ).toHaveAttribute("href", "/admin");
    expect(screen.getByText(/avisale a quien administra/)).toBeVisible();
  });

  it("says the section is under construction for 503", () => {
    render(<AdminErrorState status={503} />);
    expect(
      screen.getByRole("heading", {
        name: "Esta sección está en construcción",
      }),
    ).toBeInTheDocument();
  });

  it("stays generic for any other status", () => {
    render(<AdminErrorState status={500} />);
    expect(
      screen.getByRole("heading", { name: "Algo salió mal" }),
    ).toBeInTheDocument();
  });
});
