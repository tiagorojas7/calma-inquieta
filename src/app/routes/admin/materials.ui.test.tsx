import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminMaterials from "./materials";

const LIST = "/admin/materiales";
const ID = "11111111-1111-4111-8111-111111111111";

const loaded = {
  period: "2026-11",
  periodLabel: "noviembre 2026",
  pendingOrders: 0,
  suppliers: [],
  toDeliver: [],
  delivered: [],
  studio: [
    {
      id: ID,
      anchor: `material-${ID}`,
      name: "Pincel plano",
      price: "$ 1.000",
      state: "sin",
      onHand: 0,
      variantId: "v1",
      variants: [],
    },
  ],
  catalog: { rows: [], found: 0, total: 1 },
  query: "",
  estado: "activos",
  returnTo: `${LIST}?mes=2026-11`,
  saved: null as string | null,
};

function stub(data: typeof loaded & { saved: string | null }) {
  return createRoutesStub([
    { path: LIST, Component: AdminMaterials, loader: () => data },
  ]);
}

describe("materials admin screen", () => {
  it("renders the loaded cards with their state in words and a link to the editor", async () => {
    const Stub = stub(loaded);
    const { container } = render(<Stub initialEntries={[LIST]} />);
    expect(
      await screen.findByRole("link", { name: "Editar Pincel plano" }),
    ).toHaveAttribute("href", `${LIST}/${ID}`);
    expect(
      within(
        screen.getByRole("list", { name: "Materiales en el estudio" }),
      ).getByText("Se acabó"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Nuevo material" }),
    ).toHaveAttribute("href", `${LIST}/nuevo`);
    await expectNoAxeViolations(container);
  });

  it("shows what was saved at the top", async () => {
    const Stub = stub({ ...loaded, saved: "Pincel plano" });
    render(<Stub initialEntries={[LIST]} />);
    expect(await screen.findByText("Guardado: Pincel plano")).toBeVisible();
  });

  it("shows the empty state with a way to create the first material", async () => {
    const Stub = stub({
      ...loaded,
      studio: [],
      catalog: { rows: [], found: 0, total: 0 },
    });
    render(<Stub initialEntries={[LIST]} />);
    expect(await screen.findByText("Todavía no hay materiales.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Nuevo material" })).toBeVisible();
  });
});
