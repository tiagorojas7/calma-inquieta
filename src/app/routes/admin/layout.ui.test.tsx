import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminHome from "./home";
import AdminLayout, { ErrorBoundary } from "./layout";

const homeScreen = {
  monthLabel: "octubre 2026",
  figures: {
    collected: "$ 0",
    toCollect: "$ 0",
    studio: "$ 0",
    studioTone: "income" as const,
  },
  more: {
    occupancy: "0 %",
    occupancyDetail: "0 de 0 lugares",
    teachers: "$ 0",
    statisticsHref: "/admin/estadisticas",
  },
  todo: { cards: [], seeAllHref: null },
  classes: [],
  novelties: [],
  moreNews: false,
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
            return { screen: homeScreen, returnTo: "/admin", saved: null };
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
    expect(await screen.findByRole("heading", { name: "Hoy" })).toBeVisible();
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

describe("admin layout bell", () => {
  function renderWithCount(
    layoutData: { email: string; unseen?: number | null },
    childLoader: () => unknown = () => ({
      screen: homeScreen,
      returnTo: "/admin",
      saved: null,
    }),
  ) {
    const Stub = createRoutesStub([
      {
        id: "routes/admin/layout",
        path: "/admin",
        Component: AdminLayout,
        ErrorBoundary: ErrorBoundary as never,
        loader: () => layoutData,
        children: [
          { index: true, Component: AdminHome, loader: () => childLoader() },
        ],
      },
    ]);
    return render(<Stub initialEntries={["/admin"]} />);
  }

  it("shows the bell with the count on every admin screen, pointing to the novelties page", async () => {
    renderWithCount({ email: "agus@example.com", unseen: 2 });

    const bell = await screen.findByRole("link", {
      name: "Novedades: 2 sin leer",
    });
    expect(bell).toHaveAttribute("href", "/admin/novedades");
    expect(screen.getByTestId("admin-bell-badge")).toHaveTextContent("2");
  });

  it("hides the badge when the count could not be read, keeping the bell", async () => {
    renderWithCount({ email: "agus@example.com", unseen: null });

    expect(
      await screen.findByRole("link", { name: "Novedades" }),
    ).toHaveAttribute("href", "/admin/novedades");
    expect(screen.queryByTestId("admin-bell-badge")).toBeNull();
  });

  it("still renders the error screen, with the bell and without a count, when a section fails", async () => {
    renderWithCount({ email: "agus@example.com" }, () => {
      throw new Error("boom");
    });

    expect(
      await screen.findByRole("heading", { name: "Algo salió mal" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Novedades" })).toBeVisible();
    expect(screen.queryByTestId("admin-bell-badge")).toBeNull();
  });
});
