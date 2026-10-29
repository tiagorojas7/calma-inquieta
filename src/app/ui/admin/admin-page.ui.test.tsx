import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
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
