import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { MaterialImport, type CatalogPlanView } from "./material-import";
import { MaterialPhoto } from "./material-photo";
import { MaterialPrices, type PriceRaisePlanView } from "./material-prices";
import { MaterialsList } from "./materials-list";

const suppliers = [{ id: "s1", name: "Casa Pincel" }];

function renderInRouter(element: React.ReactNode) {
  const Stub = createRoutesStub([{ path: "/", Component: () => element }]);
  return render(<Stub />);
}

const plan = (overrides: Partial<CatalogPlanView> = {}): CatalogPlanView => ({
  supplierName: "Casa Pincel",
  rowCount: 3,
  newMaterials: 1,
  newVariants: 2,
  priceChanges: 1,
  unchanged: 0,
  errors: [],
  items: [
    {
      line: 2,
      product: "Taza",
      measure: "Grande",
      kind: "new-material",
      from: null,
      to: 1000,
    },
    {
      line: 3,
      product: "Plato",
      measure: "Hondo",
      kind: "price-change",
      from: 500,
      to: null,
    },
  ],
  ...overrides,
});

describe("MaterialImport", () => {
  it("shows the summary with an Importar button when there are no errors", async () => {
    const { container } = renderInRouter(
      <MaterialImport
        suppliers={suppliers}
        values={{ supplierId: "s1", csv: "x" }}
        plan={plan()}
      />,
    );
    expect(await screen.findByText("1 materiales nuevos")).toBeVisible();
    expect(screen.getByText("Material nuevo: $ 1.000")).toBeVisible();
    expect(screen.getByRole("button", { name: "Importar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ver resumen" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("lists line-numbered errors and offers no Importar button", async () => {
    renderInRouter(
      <MaterialImport
        suppliers={suppliers}
        values={{ supplierId: "s1", csv: "x" }}
        plan={plan({ errors: [{ line: 7, code: "invalid-price" }] })}
      />,
    );
    expect(await screen.findByText(/^Línea 7: el precio/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Importar" }),
    ).not.toBeInTheDocument();
  });

  it("says there is nothing to import when everything is already loaded", async () => {
    renderInRouter(
      <MaterialImport
        suppliers={suppliers}
        values={{ supplierId: "s1", csv: "x" }}
        plan={plan({
          newMaterials: 0,
          newVariants: 0,
          priceChanges: 0,
          unchanged: 3,
          items: [],
        })}
      />,
    );
    expect(
      await screen.findByText(
        "No hay nada para importar: todo ya está cargado.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Importar" }),
    ).not.toBeInTheDocument();
  });
});

describe("MaterialPrices", () => {
  const raise: PriceRaisePlanView = {
    materialCount: 1,
    variantCount: 1,
    skippedWithoutPrice: 1,
    beforeTotal: 1000,
    afterTotal: 1100,
    changes: [
      {
        materialId: "m1",
        name: "Taza",
        variants: [{ label: "Chica", from: 1000, to: 1100 }],
      },
    ],
  };

  it("shows before and after totals and the confirm button", async () => {
    const { container } = renderInRouter(
      <MaterialPrices
        suppliers={suppliers}
        categories={["Tazas"]}
        values={{ supplierId: "s1", category: "", percent: "10" }}
        plan={raise}
      />,
    );
    expect(await screen.findByText("Suma antes: $ 1.000")).toBeVisible();
    expect(screen.getByText("Suma después: $ 1.100")).toBeVisible();
    expect(screen.getByText("1 medidas sin precio no cambian")).toBeVisible();
    expect(screen.getByRole("button", { name: "Subir precios" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("offers no confirm button when no price would change", async () => {
    renderInRouter(
      <MaterialPrices
        suppliers={suppliers}
        categories={[]}
        values={{ supplierId: "s1", category: "", percent: "1" }}
        plan={{ ...raise, changes: [], variantCount: 0, materialCount: 0 }}
      />,
    );
    expect(
      await screen.findByText("Con ese porcentaje no cambia ningún precio."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Subir precios" }),
    ).not.toBeInTheDocument();
  });
});

describe("MaterialPhoto", () => {
  it("renders the upload field and save button without accessibility violations", async () => {
    const { container } = renderInRouter(
      <MaterialPhoto
        name="Taza"
        upload={vi.fn()}
        backHref="/admin/materiales"
      />,
    );
    expect(await screen.findByLabelText("Foto")).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar foto" })).toBeVisible();
    await expectNoAxeViolations(container);
  });
});

describe("MaterialsList photo tools", () => {
  const row = (id: string, hasImage: boolean) => ({
    id,
    name: `Material ${id}`,
    category: "Tazas",
    supplierName: "Casa Pincel",
    hasImage,
    variantCount: 1,
    active: true,
    available: true,
  });

  it("marks photoless rows and links each one to its photo screen", async () => {
    renderInRouter(
      <MaterialsList
        rows={[row("a", false), row("b", true)]}
        filter="activos"
        category=""
        supplierId=""
        categories={[]}
        suppliers={[]}
      />,
    );
    expect(await screen.findAllByText("Sin foto")).toHaveLength(1);
    const links = screen.getAllByRole("link", { name: /foto de Material/i });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/materiales/a/foto",
      "/admin/materiales/b/foto",
    ]);
    expect(
      screen.getByRole("link", { name: "Mostrar solo materiales sin foto" }),
    ).toHaveAttribute("href", "/admin/materiales?sinfoto=1&estado=activos");
  });

  it("keeps the Sin foto filter in the photo links and offers to show all", async () => {
    renderInRouter(
      <MaterialsList
        rows={[row("a", false)]}
        filter="activos"
        category=""
        supplierId=""
        categories={[]}
        suppliers={[]}
        withoutImage
      />,
    );
    expect(
      (
        await screen.findByRole("link", { name: /foto de Material a/i })
      ).getAttribute("href"),
    ).toBe("/admin/materiales/a/foto?sinfoto=1");
    expect(screen.getByRole("link", { name: "Mostrar todos" })).toBeVisible();
  });
});
