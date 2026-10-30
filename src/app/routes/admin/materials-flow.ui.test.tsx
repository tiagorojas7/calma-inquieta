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
  filter: "activos",
  category: "",
  supplierId: "",
  feedback: "created",
  categories: ["Pinceles"],
  suppliers: [{ value: "s1", label: "Casa Pincel" }],
  rows: [
    {
      id: "m1",
      name: "Pincel plano",
      category: "Pinceles",
      supplierName: "Casa Pincel",
      variantCount: 2,
      active: true,
      available: false,
    },
  ],
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
      available: true,
      used: false,
      swatch: null,
    },
  ],
  audit: { updatedBy: "admin@example.com", updatedAt: "20 oct 2026, 00:30" },
};

function crumbs() {
  return within(screen.getByRole("navigation", { name: "Migas de pan" }));
}

describe("materials guided flow", () => {
  it("list shows breadcrumbs, a banner, cards and suppliers as a secondary action", async () => {
    const Stub = createRoutesStub([
      { path: LIST, Component: AdminMaterials, loader: () => listData },
    ]);
    const { container } = render(<Stub initialEntries={[LIST]} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Material creado",
    );
    expect(crumbs().getByRole("link", { name: "Panel" })).toHaveAttribute(
      "href",
      "/admin",
    );
    const list = screen.getByRole("list", { name: "Materiales" });
    expect(within(list).getByText("Casa Pincel")).toBeVisible();
    expect(within(list).getByText("2 variantes")).toBeVisible();
    expect(screen.getByRole("link", { name: "Proveedores" })).toHaveAttribute(
      "href",
      `${LIST}/proveedores`,
    );
    await expectNoAxeViolations(container);
  });

  it("new screen has breadcrumbs and a top back link", async () => {
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
    expect(crumbs().getByRole("link", { name: "Materiales" })).toHaveAttribute(
      "href",
      LIST,
    );
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
    expect(crumbs().getByText("Pincel plano")).toHaveAttribute(
      "aria-current",
      "page",
    );
    const danger = screen.getByRole("region", { name: "Zona de riesgo" });
    expect(
      within(danger).getByRole("button", { name: "Desactivar" }),
    ).toBeVisible();
  });
});
