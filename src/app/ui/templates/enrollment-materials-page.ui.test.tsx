import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentMaterialsPage } from "./enrollment-materials-page";

const materials = [
  {
    materialId: "arcilla",
    name: "Arcilla",
    variants: [
      { variantId: "grande", label: "Grande", unitPrice: "$ 12.500" },
      { variantId: "chica", label: "Chica", unitPrice: "$ 4.000" },
    ],
  },
];
const lines = [
  {
    materialId: "arcilla",
    variantId: "grande",
    label: "Arcilla · Grande",
    quantity: 2,
    lineTotal: "$ 25.000",
  },
];

function setup(
  handlers: { onSetQuantity?: () => void; onRemove?: () => void } = {},
) {
  const props = {
    onAdd: vi.fn(),
    onSetQuantity: vi.fn(),
    onRemove: vi.fn(),
    ...handlers,
  };
  const view = render(
    <MemoryRouter>
      <EnrollmentMaterialsPage
        fee="$ 58.000"
        lines={lines}
        materials={materials}
        materialsRequired
        period="Noviembre 2026"
        total="$ 83.000"
        workshopName="Cerámica inicial"
        recoveryHref="/talleres/ceramica/inscripcion"
        {...props}
      />
    </MemoryRouter>,
  );
  return { ...view, ...props };
}

describe("EnrollmentMaterialsPage (M01-M05)", () => {
  it("shows step 2 and a back link to the student details", () => {
    setup();
    expect(screen.getByText("Paso 2 de 3")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Volver a mis datos/ }),
    ).toHaveAttribute("href", "/talleres/ceramica/inscripcion");
  });

  it("does not stick to the bottom of a phone viewport (M01)", () => {
    setup();
    const summary = screen.getByRole("complementary");
    expect(summary).not.toHaveClass("sticky");
    expect(summary).toHaveClass("lg:sticky");
  });

  it("edits and removes order lines with 44 px controls (M03)", () => {
    const { onSetQuantity, onRemove } = setup();
    const summary = within(screen.getByRole("complementary"));
    fireEvent.click(
      summary.getByRole("button", {
        name: "Aumentar cantidad de Arcilla · Grande",
      }),
    );
    expect(onSetQuantity).toHaveBeenCalledWith("grande", 3);
    const remove = summary.getByRole("button", {
      name: "Quitar Arcilla · Grande",
    });
    expect(remove.className).toContain("min-h-11");
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledWith("grande");
  });

  it("announces the updated total politely (M03)", () => {
    setup();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Total del pedido: $ 83.000");
  });

  it("groups variants as cards that show what is already in the order (M04)", () => {
    setup();
    const cards = screen.getAllByRole("group");
    expect(cards.length).toBeGreaterThan(0);
    const grande = screen.getByText("Grande · $ 12.500");
    expect(
      within(grande.closest("[data-variant-card]") as HTMLElement).getByText(
        "En tu pedido: 2",
      ),
    ).toBeInTheDocument();
    const chica = screen.getByText("Chica · $ 4.000");
    expect(
      within(chica.closest("[data-variant-card]") as HTMLElement).queryByText(
        /En tu pedido/,
      ),
    ).toBeNull();
  });

  it("uses a 44 px stepper for the quantity to add (M05)", () => {
    setup();
    const input = screen.getByLabelText("Cantidad para Arcilla Grande");
    expect(input.className).toContain("min-h-11");
    expect(
      screen.getByRole("button", {
        name: "Aumentar cantidad de Arcilla Grande",
      }).className,
    ).toContain("size-11");
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    await expectNoAxeViolations(container);
  });
});
