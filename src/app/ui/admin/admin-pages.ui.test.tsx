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
  nextMonthLabel: "noviembre 2026",
  occupancy: { percent: 40, confirmed: 4, capacity: 10, free: 6 },
  pending: { total: 5, older: 2 },
  confirmedThisMonth: 3,
  income: { total: "$ 28.000", fee: "$ 25.000", materials: "$ 3.000" },
  materialsToOrder: { orders: 3, units: 6 },
  alerts: {
    withoutOpenPeriod: [{ workshopId: "w2", name: "Acuarela" }],
  },
};

describe("AdminLanding", () => {
  it("greets by email and shows the month summary, alerts and every area", async () => {
    const { container } = render(
      <AdminLanding email="agus@example.com" summary={summary} />,
    );
    expect(screen.getByText("Hola, agus@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Resumen de octubre 2026" }),
    ).toBeVisible();
    for (const text of [
      "40 %",
      "4 inscriptas de 10 cupos, 6 libres.",
      "2 esperan hace más de 48 horas.",
      "$ 28.000",
      "6 unidades en 3 pedidos.",
    ])
      expect(screen.getByText(text)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("links each card and alert to the screen where it is handled", () => {
    render(<AdminLanding email="agus@example.com" summary={summary} />);
    const href = (name: RegExp) =>
      screen.getByRole("link", { name }).getAttribute("href");
    expect(href(/Ver ocupación/)).toBe("/admin/estadisticas?mes=2026-10");
    expect(href(/Revisar solicitudes: Solicitudes pendientes/)).toBe(
      "/admin/inscripciones?estado=pending_confirmation",
    );
    expect(href(/Ver confirmadas/)).toBe(
      "/admin/inscripciones?estado=paid&mes=2026-10",
    );
    expect(href(/Ver ingresos/)).toBe("/admin/estadisticas?mes=2026-10");
    expect(href(/Armar el pedido a proveedores/)).toBe(
      "/admin/inscripciones/materiales",
    );
    expect(href(/Abrir inscripción de Acuarela/)).toBe(
      "/admin/talleres/w2/periodos",
    );
    expect(
      screen.getByText(
        "Acuarela no tiene inscripción abierta para noviembre 2026.",
      ),
    ).toBeVisible();
  });

  it("lists the areas, Estadísticas included", () => {
    render(<AdminLanding email="agus@example.com" summary={summary} />);
    const areas = screen.getByRole("heading", { name: "Secciones" })
      .parentElement as HTMLElement;
    expect(
      within(areas)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Talleres",
      "Intensivos",
      "Profesores",
      "Inscripciones",
      "Alumnas",
      "Asistencia",
      "Materiales",
      "Eventos privados",
      "Estadísticas",
      "Recordatorios",
    ]);
  });

  it("says there are no alerts when nothing needs attention", () => {
    render(
      <AdminLanding
        email="agus@example.com"
        summary={{
          ...summary,
          pending: { total: 0, older: 0 },
          materialsToOrder: { orders: 0, units: 0 },
          alerts: { withoutOpenPeriod: [] },
        }}
      />,
    );
    expect(
      screen.getByText("No hay alertas pendientes. Está todo al día."),
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
