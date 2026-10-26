import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { EnrollmentMaterialsPage } from "~/app/ui/templates/enrollment-materials-page";

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

describe("EnrollmentMaterialsPage", () => {
  it("shows offered variants, adds a selected quantity and keeps the total visible", () => {
    const onAdd = vi.fn();
    render(
      <EnrollmentMaterialsPage
        fee="$ 58.000"
        lines={[
          {
            materialId: "arcilla",
            variantId: "grande",
            label: "Arcilla · Grande",
            quantity: 2,
            lineTotal: "$ 25.000",
          },
        ]}
        materials={materials}
        materialsRequired
        onAdd={onAdd}
        period="Noviembre 2026"
        total="$ 83.000"
        workshopName="Cerámica inicial"
      />,
    );

    expect(screen.getByText("Materiales requeridos")).toBeVisible();
    expect(screen.getByText("Grande · $ 12.500")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Cantidad para Arcilla Grande"), {
      target: { value: "2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar Arcilla Grande" }),
    );
    expect(onAdd).toHaveBeenCalledWith("arcilla", "grande", 2);

    const total = screen.getByText("$ 83.000");
    expect(total.closest("aside")).toHaveClass("sticky");
  });

  it("offers a clear recovery path when the student draft is missing", () => {
    const { container } = render(
      <MemoryRouter>
        <EnrollmentMaterialsPage
          draftState="missing"
          fee="$ 58.000"
          lines={[]}
          materials={materials}
          materialsRequired
          onAdd={vi.fn()}
          period="Noviembre 2026"
          recoveryHref="/talleres/ceramica/inscripcion?period=2026-11"
          total="$ 58.000"
          workshopName="Cerámica inicial"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Volvé a completar tus datos para continuar."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver a la inscripción" }),
    ).toHaveAttribute("href", "/talleres/ceramica/inscripcion?period=2026-11");
    expect(container.querySelector("form")).toBeNull();
  });

  it("lets an optional cart continue empty", () => {
    render(
      <EnrollmentMaterialsPage
        fee="$ 58.000"
        lines={[]}
        materials={materials}
        materialsRequired={false}
        onAdd={vi.fn()}
        period="Noviembre 2026"
        total="$ 58.000"
        workshopName="Cerámica inicial"
      />,
    );

    expect(screen.getByText("Ya tengo mis materiales")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continuar sin materiales" }),
    ).toBeEnabled();
  });
});
