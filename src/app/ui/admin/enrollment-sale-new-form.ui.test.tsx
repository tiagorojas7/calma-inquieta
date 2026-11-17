import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentNewMaterials } from "./enrollment-new-materials";
import { EnrollmentSaleNewForm } from "./enrollment-sale-new-form";

const order = {
  id: "o1",
  number: "CI-2026-0007",
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  month: "noviembre 2026",
};
const materials = [
  {
    materialId: "m-1",
    variantId: "v-1",
    name: "Arcilla blanca",
    label: "1 kg",
    unitPrice: 4000,
    priceLabel: "$ 4.000",
    onHand: 3,
  },
  {
    materialId: "m-2",
    variantId: "v-2",
    name: "Pincel",
    label: "Número 4",
    unitPrice: 1500,
    priceLabel: "$ 1.500",
    onHand: 0,
  },
];

const renderForm = (
  props: Partial<Parameters<typeof EnrollmentSaleNewForm>[0]> = {},
) =>
  render(
    <EnrollmentSaleNewForm
      order={order}
      materials={materials}
      cancelHref="/admin/inscripciones/o1"
      {...props}
    />,
  );

describe("EnrollmentSaleNewForm", () => {
  it("says whose record the sale goes under and starts as a native post form", async () => {
    const { container } = renderForm();

    const form = screen.getByRole("form", {
      name: "Nueva venta de materiales",
    });
    expect(form).toHaveAttribute("method", "post");
    expect(within(form).getByText(/Ana Pérez/)).toBeVisible();
    expect(within(form).getByText(/Cerámica/)).toBeVisible();
    expect(within(form).getByText(/noviembre 2026/)).toBeVisible();
    expect(within(form).getByText(/CI-2026-0007/)).toBeVisible();
    expect(
      within(form).getByRole("button", { name: "Crear venta" }),
    ).toBeVisible();
    expect(
      within(form).getByRole("link", { name: "Cancelar" }),
    ).toHaveAttribute("href", "/admin/inscripciones/o1");
    await expectNoAxeViolations(container);
  });

  it("searches the catalog like the manual enrollment and posts each choice as a line", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar material" }),
      "arcilla",
    );
    expect(screen.getByText(/1 kg/)).toHaveTextContent("En stock: 3");
    await user.click(
      screen.getByRole("button", { name: "Agregar Arcilla blanca 1 kg" }),
    );
    const quantity = screen.getByRole("spinbutton");
    await user.clear(quantity);
    await user.type(quantity, "2");

    expect(
      Object.fromEntries(
        new FormData(container.querySelector("form") as HTMLFormElement),
      ),
    ).toEqual({ "line:m-1:v-1": "2" });
  });

  it("shows the sale total as the only total, with no fee", () => {
    renderForm({
      lines: [
        { materialId: "m-1", variantId: "v-1", quantity: "2" },
        { materialId: "m-2", variantId: "v-2", quantity: "1" },
      ],
    });

    const summary = screen.getByRole("group", { name: "Resumen" });
    expect(within(summary).getByText("Total")).toBeVisible();
    expect(within(summary).getByText("$ 9.500")).toBeVisible();
    expect(within(summary).queryByText("Cuota")).toBeNull();
  });

  it("keeps the chosen lines and shows the refusals", () => {
    renderForm({
      lines: [{ materialId: "m-1", variantId: "v-1", quantity: "0" }],
      errors: {
        materials: "Cada material lleva entre 1 y 20 unidades enteras.",
      },
      formError: "Esta inscripción está cancelada.",
    });

    expect(
      screen.getAllByRole("alert").map((alert) => alert.textContent),
    ).toEqual(
      expect.arrayContaining([
        "Esta inscripción está cancelada.",
        "Cada material lleva entre 1 y 20 unidades enteras.",
      ]),
    );
    expect(screen.getByRole("spinbutton")).toHaveValue(0);
  });

  it("keeps the manual enrollment's picker as it was: fee and total rows", () => {
    render(
      <EnrollmentNewMaterials
        choices={materials}
        fee="40000"
        initialLines={[{ materialId: "m-1", variantId: "v-1", quantity: "1" }]}
      />,
    );

    const summary = screen.getByRole("group", { name: "Resumen" });
    expect(within(summary).getByText("Cuota")).toBeVisible();
    expect(within(summary).getByText("$ 44.000")).toBeVisible();
  });
});
