import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminHome from "./home";
import AdminLayout, { ErrorBoundary } from "./layout";

const summary = {
  period: "2026-10",
  monthLabel: "octubre 2026",
  nextMonthLabel: "noviembre 2026",
  occupancy: { percent: 0, confirmed: 0, capacity: 0, free: 0 },
  pending: { total: 0, older: 0 },
  confirmedThisMonth: 0,
  income: { total: "$ 0", fee: "$ 0", materials: "$ 0" },
  materialsToOrder: { orders: 0, units: 0 },
  alerts: { withoutOpenPeriod: [] },
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
    expect(await screen.findByText("Hola, agus@example.com")).toBeVisible();
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
