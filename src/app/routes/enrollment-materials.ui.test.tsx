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

const baseProps = {
  fee: "$ 58.000",
  lines: [],
  materialsRequired: true,
  onSelect: vi.fn(),
  onRemove: vi.fn(),
  onSetQuantity: vi.fn(),
  period: "Noviembre 2026",
  total: "$ 58.000",
  workshopName: "Cerámica inicial",
};

describe("EnrollmentMaterialsPage photos", () => {
  it("shows the material photo with its alt, fixed size and lazy loading, plus the swatch", () => {
    const { container } = render(
      <EnrollmentMaterialsPage
        {...baseProps}
        materials={[
          {
            materialId: "arcilla",
            name: "Arcilla",
            image: {
              src: "/media/arcilla.webp",
              alt: "Arcilla blanca",
              width: 800,
              height: 600,
            },
            variants: [
              {
                variantId: "grande",
                label: "Grande",
                unitPrice: "$ 12.500",
                swatch: "#aabbcc",
              },
            ],
          },
        ]}
      />,
    );
    const photo = container.querySelector("img") as HTMLImageElement;
    expect(photo).toHaveAttribute("alt", "Arcilla blanca");
    expect(photo).toHaveAttribute("src", "/media/arcilla.webp");
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo).toHaveAttribute("width", "800");
    expect(photo).toHaveAttribute("height", "600");
    expect(photo).toHaveClass("object-cover");
    const swatch = container.querySelector("[data-swatch]");
    expect(swatch).toHaveStyle({ backgroundColor: "#aabbcc" });
    expect(swatch).toHaveAttribute("aria-hidden", "true");
  });

  it("shows an aria-hidden placeholder and no image when there is no photo", () => {
    const { container } = render(
      <EnrollmentMaterialsPage
        {...baseProps}
        materials={[
          {
            materialId: "arcilla",
            name: "Arcilla",
            image: null,
            variants: [
              {
                variantId: "grande",
                label: "Grande",
                unitPrice: "$ 12.500",
                swatch: null,
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    const placeholder = container.querySelector("[data-material-placeholder]");
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[data-swatch]")).toBeNull();
  });
});

describe("EnrollmentMaterialsPage", () => {
  it("shows offered variants, adds a selected quantity and keeps the total visible", () => {
    const onSelect = vi.fn();
    const onSetQuantity = vi.fn();
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
        onSelect={onSelect}
        onRemove={vi.fn()}
        onSetQuantity={onSetQuantity}
        period="Noviembre 2026"
        total="$ 83.000"
        workshopName="Cerámica inicial"
      />,
    );

    expect(screen.getByText("Materiales requeridos")).toBeVisible();
    expect(screen.getByText("Grande · $ 12.500")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Cantidad para Arcilla"), {
      target: { value: "3" },
    });
    expect(onSetQuantity).toHaveBeenCalledWith("grande", 3);
    fireEvent.click(screen.getByRole("radio", { name: /Chica/ }));
    expect(onSelect).toHaveBeenCalledWith("arcilla", "chica", 2);

    const total = screen.getByText("$ 83.000");
    expect(total.closest("aside")).toHaveClass("lg:sticky");
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
          onSelect={vi.fn()}
          onRemove={vi.fn()}
          onSetQuantity={vi.fn()}
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
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        onSetQuantity={vi.fn()}
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
