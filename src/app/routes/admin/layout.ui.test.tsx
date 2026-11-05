import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminHome from "./home";
import AdminLayout, { ErrorBoundary } from "./layout";

const summary = {
  period: "2026-10",
  monthLabel: "octubre 2026",
  tasks: [],
  figures: {
    collected: "$ 0",
    profit: "$ 0",
    teachers: "$ 0",
    occupancy: "0 %",
    occupancyDetail: "0 de 0 lugares",
  },
};

function renderAdmin(childLoader: () => unknown) {
  const Stub = createRoutesStub([
    {
      id: "routes/admin/layout",
      path: "/admin",
      Component: AdminLayout,
      ErrorBoundary: ErrorBoundary as never,
      loader: () => ({ email: "agus@example.com" }),
      children: [
        {
          index: true,
          Component: AdminHome,
          loader: () => {
            childLoader();
            return { email: "agus@example.com", summary };
          },
        },
      ],
    },
  ]);
  return render(<Stub initialEntries={["/admin"]} />);
}

describe("admin layout screens", () => {
  it("renders the landing inside the admin chrome", async () => {
    const { container } = renderAdmin(() => undefined);
    expect(
      await screen.findByText("Lo que necesita tu atención hoy."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Salir" })).toBeVisible();
    await expectNoAxeViolations(container, { page: true });
  });

  it("shows a generic Spanish error inside the layout, never the internals", async () => {
    const { container } = renderAdmin(() => {
      throw new Error("secret stack detail");
    });
    expect(
      await screen.findByRole("heading", { name: "Algo salió mal" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Salir" })).toBeVisible();
    expect(container.textContent).not.toContain("secret stack detail");
  });

  it("offers a native retry link to the failed screen", async () => {
    renderAdmin(() => {
      throw new Error("boom");
    });
    expect(
      await screen.findByRole("link", { name: "Reintentar" }),
    ).toHaveAttribute("href", "/admin");
  });

  it("shows the construction state for a 503 from a section", async () => {
    renderAdmin(() => {
      throw data(null, { status: 503 });
    });
    expect(
      await screen.findByRole("heading", {
        name: "Esta sección está en construcción",
      }),
    ).toBeVisible();
  });
});
