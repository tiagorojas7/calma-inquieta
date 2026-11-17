import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminNotifications } from "./notifications";

const novelty = {
  key: "enrollment:1",
  href: "/admin/inscripciones/1",
  name: "Ana Pérez",
  kindLabel: "Inscripción",
  detail: "Cerámica · noviembre 2026",
  receivedAt: "30/10/2026 12:00",
};

const payment = {
  key: "enrollment:2",
  href: "/admin/inscripciones/2",
  name: "Bea Gómez",
  owedLabel: "Cuota del mes",
  amount: "$ 58.000",
  detail: "Cerámica · noviembre 2026",
};

describe("AdminNotifications", () => {
  it("lists the new requests and the pending payments in two named sections, each linking to its admin page", async () => {
    const { container } = render(
      <AdminNotifications novelties={[novelty]} payments={[payment]} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Novedades" }),
    ).toBeVisible();
    const news = screen.getByRole("region", { name: "Nuevas" });
    expect(
      within(news).getByRole("link", { name: "Ana Pérez" }),
    ).toHaveAttribute("href", "/admin/inscripciones/1");
    expect(within(news).getByText("Inscripción")).toBeVisible();
    expect(within(news).getByText("Cerámica · noviembre 2026")).toBeVisible();
    expect(within(news).getByText(/30\/10\/2026 12:00/)).toBeVisible();
    expect(within(news).getByText("1 sin abrir")).toBeVisible();

    const owed = screen.getByRole("region", { name: "Pagos pendientes" });
    expect(
      within(owed).getByRole("link", { name: "Bea Gómez" }),
    ).toHaveAttribute("href", "/admin/inscripciones/2");
    expect(within(owed).getByText("Cuota del mes")).toBeVisible();
    expect(within(owed).getByText("$ 58.000")).toBeVisible();
    expect(within(owed).getByText("1 pago pendiente")).toBeVisible();
    await expectNoAxeViolations(container, { page: true });
  });

  it("explains each empty section on its own", () => {
    render(<AdminNotifications novelties={[]} payments={[]} />);

    expect(
      screen.getByRole("heading", { name: "No hay nada nuevo" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No hay pagos pendientes" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.getByRole("link", { name: "Ver inscripciones" }),
    ).toHaveAttribute("href", "/admin/inscripciones");
  });

  it("shows pending payments even when nothing is new, with no due date wording", () => {
    const { container } = render(
      <AdminNotifications novelties={[]} payments={[payment]} />,
    );

    expect(screen.getByRole("link", { name: "Bea Gómez" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No hay nada nuevo" }),
    ).toBeVisible();
    expect(container.textContent).not.toMatch(/vencid|vence/i);
  });

  it("uses plain anchors only, touch-sized, and no colour gradients", () => {
    const { container } = render(
      <AdminNotifications novelties={[novelty]} payments={[payment]} />,
    );

    expect(container.querySelector("form, button")).toBeNull();
    for (const link of screen.getAllByRole("link", { name: /Ana|Bea/ }))
      expect(link).toHaveClass("min-h-11");
    expect(container.innerHTML).not.toMatch(/gradient/);
  });
});
