import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminMaterials from "./materials";

const LIST = "/admin/materiales";

const loaded = {
  filter: "activos",
  category: "Pinceles",
  supplierId: "s1",
  categories: ["Bastidores", "Pinceles"],
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

function stub(data: typeof loaded) {
  return createRoutesStub([
    { path: LIST, Component: AdminMaterials, loader: () => data },
  ]);
}

describe("materials admin list screen", () => {
  it("renders the rows with plain anchors and the unavailable note", async () => {
    const Stub = stub(loaded);
    const { container } = render(<Stub initialEntries={[LIST]} />);
    expect(
      await screen.findByRole("link", { name: "Pincel plano" }),
    ).toHaveAttribute("href", `${LIST}/m1`);
    expect(screen.getByText("No disponible")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Nuevo material" }),
    ).toHaveAttribute("href", `${LIST}/nuevo`);
    expect(screen.getByRole("link", { name: "Proveedores" })).toHaveAttribute(
      "href",
      `${LIST}/proveedores`,
    );
    await expectNoAxeViolations(container);
  });

  it("keeps the category and supplier on the state links and preselects them", async () => {
    const Stub = stub(loaded);
    render(<Stub initialEntries={[LIST]} />);
    const inactive = await screen.findByRole("link", { name: "Inactivos" });
    expect(inactive).toHaveAttribute(
      "href",
      `${LIST}?categoria=Pinceles&proveedor=s1&estado=inactivos`,
    );
    expect(screen.getByRole("link", { name: "Activos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const form = screen.getByRole("form", { name: "Filtrar materiales" });
    expect(form).toHaveAttribute("method", "get");
    expect(within(form).getByLabelText("Categoría")).toHaveValue("Pinceles");
    expect(within(form).getByLabelText("Proveedor")).toHaveValue("s1");
  });

  it("shows the empty state with a way to create the first material", async () => {
    const Stub = stub({ ...loaded, rows: [] });
    render(<Stub initialEntries={[LIST]} />);
    expect(
      await screen.findByRole("heading", {
        name: "No hay materiales con estos filtros",
      }),
    ).toBeVisible();
  });
});
