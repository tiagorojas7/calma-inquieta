import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminMaterialDetail from "./material-detail";
import AdminMaterialNew from "./material-new";
import AdminMaterials from "./materials";

const LIST = "/admin/materiales";
const ID = "11111111-1111-4111-8111-111111111111";

const listData = {
  period: "2026-11",
  periodLabel: "noviembre 2026",
  pendingOrders: 0,
  suppliers: [],
  toDeliver: [],
  delivered: [],
  studio: [
    {
      id: "m1",
      anchor: "material-m1",
      name: "Pincel plano",
      price: "$ 1.000",
      state: "hay",
      onHand: 3,
      variantId: "v1",
      variants: [],
    },
  ],
  catalog: { rows: [], found: 0, total: 1 },
  query: "",
  estado: "activos",
  returnTo: "/admin/materiales?mes=2026-11",
  saved: "Pincel plano",
};

const detailData = {
  id: ID,
  name: "Pincel plano",
  description: "Para acrílico.",
  category: "Pinceles",
  active: true,
  available: true,
  feedback: "saved",
  supplierId: "",
  suppliers: [],
  image: null,
  variants: [
    {
      id: "v1",
      label: "Chico",
      price: "2500",
      cost: "",
      onHand: 0,
      available: true,
      used: false,
      swatch: null,
    },
  ],
  audit: { updatedBy: "admin@example.com", updatedAt: "20 oct 2026, 00:30" },
};

describe("materials guided flow", () => {
  it("list shows a saved banner, the four sections and the tools behind a closed disclosure", async () => {
    const Stub = createRoutesStub([
      { path: LIST, Component: AdminMaterials, loader: () => listData },
    ]);
    const { container } = render(<Stub initialEntries={[LIST]} />);
    expect(await screen.findByText("Guardado: Pincel plano")).toBeVisible();
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Para entregar", "Para pedir", "En el estudio", "Catálogo"]);
    expect(
      within(
        screen.getByRole("list", { name: "Materiales en el estudio" }),
      ).getByText("Hay 3"),
    ).toBeVisible();
    expect(
      screen.getByText("Herramientas").closest("details"),
    ).not.toHaveAttribute("open");
    await expectNoAxeViolations(container);
  });

  it("new screen has a top back link", async () => {
    const Stub = createRoutesStub([
      {
        path: `${LIST}/nuevo`,
        Component: AdminMaterialNew,
        loader: () => ({ suppliers: [] }),
        action: () => null,
        HydrateFallback: () => null,
      },
    ]);
    render(<Stub initialEntries={[`${LIST}/nuevo`]} />);
    expect(
      await screen.findByRole("link", { name: "Volver a materiales" }),
    ).toHaveAttribute("href", LIST);
  });

  it("detail shows breadcrumbs, a saved banner and a separated danger zone", async () => {
    const Stub = createRoutesStub([
      {
        path: `${LIST}/:id`,
        Component: AdminMaterialDetail,
        loader: () => detailData,
        HydrateFallback: () => null,
        action: () => null,
      },
    ]);
    render(<Stub initialEntries={[`${LIST}/${ID}`]} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cambios guardados",
    );
    expect(
      screen.queryByRole("navigation", { name: "Migas de pan" }),
    ).not.toBeInTheDocument();
    const danger = screen.getByRole("region", { name: "Estado del material" });
    expect(
      within(danger).getByRole("button", { name: "Archivar" }),
    ).toBeVisible();
  });
});
