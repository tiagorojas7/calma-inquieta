import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminAreaProvider } from "./admin-area";
import { AdminFeedback, AdminPageActions, AdminPageHeader } from "./admin-page";

describe("AdminPageHeader", () => {
  it("renders one heading with optional back link, breadcrumbs, description and actions", async () => {
    const { container } = render(
      <AdminPageHeader
        title="Editar taller"
        description="Actualizá los datos del taller."
        back={{ href: "/admin/talleres", label: "Volver a talleres" }}
        breadcrumbs={[
          { href: "/admin", label: "Panel" },
          { href: "/admin/talleres", label: "Talleres" },
          { label: "Editar taller" },
        ]}
        actions={<a href="/admin/talleres/nuevo">Nuevo taller</a>}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Editar taller" }),
    ).toBeVisible();
    expect(screen.getByText("Actualizá los datos del taller.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver a talleres" }),
    ).toHaveAttribute("href", "/admin/talleres");
    const breadcrumbs = screen.getByRole("navigation", {
      name: "Migas de pan",
    });
    expect(
      within(breadcrumbs).getByRole("link", { name: "Panel" }),
    ).toHaveAttribute("href", "/admin");
    expect(within(breadcrumbs).getByText("Editar taller")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Nuevo taller" })).toHaveAttribute(
      "href",
      "/admin/talleres/nuevo",
    );
    await expectNoAxeViolations(container);
  });
});

describe("AdminPageActions", () => {
  it("keeps primary and secondary native actions in a wrapping action group", () => {
    render(
      <AdminPageActions
        primary={<button type="button">Guardar</button>}
        secondary={<a href="/admin/talleres">Cancelar</a>}
      />,
    );

    const actions = screen.getByRole("group", { name: "Acciones" });
    expect(
      within(actions).getByRole("button", { name: "Guardar" }),
    ).toBeVisible();
    expect(
      within(actions).getByRole("link", { name: "Cancelar" }),
    ).toHaveAttribute("href", "/admin/talleres");
  });
});

describe("AdminFeedback", () => {
  it("announces visible state text with the appropriate live role", async () => {
    const { container, rerender } = render(
      <AdminFeedback tone="success" title="Asistencia guardada.">
        Ya podés continuar.
      </AdminFeedback>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Asistencia guardada. Ya podés continuar.",
    );

    rerender(
      <AdminFeedback tone="error" title="No pudimos guardar.">
        Revisá los datos e intentá de nuevo.
      </AdminFeedback>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos guardar.");
    await expectNoAxeViolations(container);
  });
});

describe("AdminPageHeader wayfinding", () => {
  it("renders the back link as a large visible button with an arrow", () => {
    render(
      <AdminPageHeader
        title="Editar taller"
        back={{ href: "/admin/talleres", label: "Volver a talleres" }}
      />,
    );
    const back = screen.getByRole("link", { name: "Volver a talleres" });
    expect(back).toHaveAttribute("data-variant", "secondary");
    expect(back).toHaveAttribute("data-role", "back");
    expect(back).toHaveClass("min-h-12");
    expect(back.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("sets the title on a raised sheet, with the actions beside it", () => {
    render(
      <AdminPageHeader
        title="Talleres"
        description="Lo que está en marcha."
        actions={<a href="/admin/talleres/nuevo">Nuevo taller</a>}
      />,
    );
    const sheet = screen
      .getByRole("heading", { level: 1 })
      .closest("[data-title-sheet]");

    expect(sheet).toHaveClass("bg-surface", "shadow-card", "lg:flex-row");
    expect(sheet).toContainElement(
      screen.getByRole("link", { name: "Nuevo taller" }),
    );
    expect(screen.getByText("Lo que está en marcha.")).toHaveClass(
      "text-ink-700",
    );
  });

  it("keeps the header unfilled and carries the area color only on its icon chip", () => {
    render(
      <AdminAreaProvider area="workshops">
        <AdminPageHeader title="Talleres" />
      </AdminAreaProvider>,
    );
    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-area", "workshops");
    expect(header.className).not.toMatch(/bg-area-/);
    const icon = header.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.parentElement?.className).toMatch(/bg-area-workshops-bg/);
  });

  it("stays plain outside an area", () => {
    render(<AdminPageHeader title="Talleres" />);
    expect(screen.getByRole("banner")).not.toHaveAttribute("data-area");
  });
});
