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
    onSelect: vi.fn(),
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

  it("shows each measure as a radio option with its label and price, checked when in the order (M04)", () => {
    setup();
    const grande = screen.getByRole("radio", { name: "Grande · $ 12.500" });
    expect(grande).toBeChecked();
    expect(grande).toHaveAttribute("name", "variant-arcilla");
    expect(grande).toHaveAttribute("value", "grande");
    expect(
      screen.getByRole("radio", { name: "Chica · $ 4.000" }),
    ).not.toBeChecked();
    expect(screen.getByText("En tu pedido: 2")).toBeInTheDocument();
  });

  it("chooses a measure with the radio and reports the quantity already picked", () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByRole("radio", { name: "Chica · $ 4.000" }));
    expect(onSelect).toHaveBeenCalledWith("arcilla", "chica", 2);
  });

  it("keeps the radio and the quantity as real form fields", () => {
    const { container } = setup();
    const form = container.querySelector("form") as HTMLFormElement;
    const data = new FormData(form);
    expect(data.get("variant-arcilla")).toBe("grande");
    expect(data.get("quantity-arcilla")).toBe("2");
  });

  it("uses a 44 px stepper for the quantity to add (M05)", () => {
    setup();
    const input = screen.getByLabelText("Cantidad para Arcilla");
    expect(input.className).toContain("min-h-11");
    expect(
      screen.getByRole("button", {
        name: "Aumentar cantidad de Arcilla",
      }).className,
    ).toContain("size-11");
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    await expectNoAxeViolations(container);
  });
});

describe("EnrollmentMaterialsPage selector (S6)", () => {
  const onRequestMaterials = [
    {
      materialId: "arcilla",
      name: "Arcilla",
      category: "Arcillas",
      variants: [
        { variantId: "grande", label: "Grande", unitPrice: "$ 12.500" },
        {
          variantId: "especial",
          label: "40 × 20 × 10 alto",
          unitPrice: null,
          onRequest: true,
          whatsappHref: "https://wa.me/549351?text=hola",
        },
      ],
    },
    {
      materialId: "pintura",
      name: "Pintura",
      category: "Esmaltes",
      variants: [
        {
          variantId: "unica",
          label: "Única",
          unitPrice: null,
          onRequest: true,
          whatsappHref: "https://wa.me/549351?text=pintura",
        },
      ],
    },
  ];
  const props = {
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

  it("shows a measure without a price as a Consultar precio WhatsApp link, not as an option", () => {
    render(
      <MemoryRouter>
        <EnrollmentMaterialsPage {...props} materials={onRequestMaterials} />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", {
      name: "Consultar precio de Arcilla, 40 × 20 × 10 alto, por WhatsApp",
    });
    expect(link).toHaveAttribute("href", "https://wa.me/549351?text=hola");
    expect(screen.queryByRole("radio", { name: /40 × 20/ })).toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(1);
  });

  it("keeps a product whose measures are all on request, with a link per measure and no quantity", () => {
    render(
      <MemoryRouter>
        <EnrollmentMaterialsPage {...props} materials={onRequestMaterials} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", {
        name: "Consultar precio de Pintura, Única, por WhatsApp",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Cantidad para Pintura")).toBeNull();
  });

  it("groups products by category and filters them when there are several", async () => {
    render(
      <MemoryRouter>
        <EnrollmentMaterialsPage {...props} materials={onRequestMaterials} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Arcillas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Esmaltes" }),
    ).toBeInTheDocument();
    const esmaltes = await screen.findByRole("button", { name: "Esmaltes" });
    expect(esmaltes).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(esmaltes);
    expect(esmaltes).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Arcillas" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Arcillas" }),
    ).toBeInTheDocument();
  });

  it("shows no filter when there is a single category", () => {
    render(
      <MemoryRouter>
        <EnrollmentMaterialsPage
          {...props}
          materials={onRequestMaterials.slice(0, 1)}
        />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("group", { name: "Filtrar por categoría" }),
    ).toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <EnrollmentMaterialsPage {...props} materials={onRequestMaterials} />
      </MemoryRouter>,
    );
    await expectNoAxeViolations(container);
  });
});
