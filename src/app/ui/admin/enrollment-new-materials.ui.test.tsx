import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentNewMaterials } from "./enrollment-new-materials";

const choices = [
  {
    materialId: "m-1",
    variantId: "v-1",
    name: "Arcilla blanca",
    label: "1 kg",
    unitPrice: 4000,
    priceLabel: "$ 4.000",
    onHand: 3,
    keptInStudio: true,
  },
  {
    materialId: "m-1",
    variantId: "v-2",
    name: "Arcilla blanca",
    label: "5 kg",
    unitPrice: 17500,
    priceLabel: "$ 17.500",
  },
  {
    materialId: "m-2",
    variantId: "v-3",
    name: "Pincel",
    label: "Número 4",
    unitPrice: 1500,
    priceLabel: "$ 1.500",
  },
];

function renderMaterials(
  props: Partial<Parameters<typeof EnrollmentNewMaterials>[0]> = {},
) {
  const onSubmit = vi.fn((event: React.SyntheticEvent) => {
    event.preventDefault();
  });
  const view = render(
    <form onSubmit={onSubmit} aria-label="prueba">
      <EnrollmentNewMaterials choices={choices} fee="40000" {...props} />
      <button type="submit">Enviar</button>
    </form>,
  );
  return { ...view, onSubmit };
}

const posted = (container: HTMLElement) =>
  Object.fromEntries(
    new FormData(container.querySelector("form") as HTMLFormElement).entries(),
  );

describe("EnrollmentNewMaterials stock labels", () => {
  it("reads 'En stock: N' only for a kept material with units, and 'Se pide' otherwise", async () => {
    const user = userEvent.setup();
    const firstChoice = choices[0];
    if (!firstChoice) throw new Error("missing material fixture");
    renderMaterials({
      choices: [
        { ...firstChoice, variantId: "k-1", label: "alfa" },
        {
          ...firstChoice,
          variantId: "k-0",
          label: "bravo",
          onHand: 0,
        },
        {
          ...firstChoice,
          variantId: "n-3",
          label: "charlie",
          keptInStudio: false,
        },
        {
          ...firstChoice,
          variantId: "n-u",
          label: "delta",
          onHand: 0,
          keptInStudio: false,
        },
      ],
    });
    await user.type(screen.getByRole("searchbox"), "arcilla");
    const row = (label: string) =>
      screen.getByText(new RegExp(`^${label} ·`)).closest("li") as HTMLElement;
    expect(row("alfa")).toHaveTextContent("En stock: 3");
    expect(row("bravo")).toHaveTextContent("Se pide");
    expect(row("charlie")).toHaveTextContent("Se pide");
    expect(row("charlie")).not.toHaveTextContent("En stock");
    expect(row("delta")).toHaveTextContent("Se pide");
  });

  it("shows the units on hand of a variant that has them, and 'Se pide' for one that has none", async () => {
    const user = userEvent.setup();
    renderMaterials();
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar material" }),
      "arcilla",
    );
    const [inStock, toOrder] = screen.getAllByRole("listitem");
    expect(within(inStock as HTMLElement).getByText(/1 kg/)).toHaveTextContent(
      "En stock: 3",
    );
    expect(within(toOrder as HTMLElement).getByText(/5 kg/)).toHaveTextContent(
      "Se pide",
    );
    expect(within(toOrder as HTMLElement).queryByText(/En stock/)).toBeNull();
  });

  it("keeps the label on the chosen line", () => {
    renderMaterials({
      initialLines: [{ materialId: "m-1", variantId: "v-1", quantity: "1" }],
    });
    expect(screen.getByText(/1 kg/)).toHaveTextContent("En stock: 3");
  });
});

describe("EnrollmentNewMaterials after Agregar", () => {
  async function addArcilla() {
    const user = userEvent.setup();
    const view = renderMaterials({ fee: undefined });
    await user.type(screen.getByRole("searchbox"), "arcilla");
    await user.click(
      screen.getByRole("button", { name: "Agregar Arcilla blanca 1 kg" }),
    );
    return { user, ...view };
  }

  it("confirms with 'Agregado' and shows the chosen item right under the search box", async () => {
    await addArcilla();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Agregado: Arcilla blanca 1 kg",
    );
    const search = screen.getByRole("searchbox");
    const chosen = screen.getByRole("spinbutton", {
      name: "Cantidad de Arcilla blanca 1 kg",
    });
    expect(
      search.compareDocumentPosition(chosen) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Nothing but the chosen block sits between the search box and the item.
    expect(screen.queryByRole("button", { name: /^Agregar / })).toBeNull();
  });

  it("collapses the result list and clears the search, so the next material starts fresh", async () => {
    await addArcilla();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.queryByText("Escribí para buscar.")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Agregar Arcilla blanca 5 kg" }),
    ).toBeNull();
  });

  it("keeps a running total and a Quitar on the chosen item", async () => {
    const { user } = await addArcilla();
    expect(screen.getByRole("group", { name: "Resumen" })).toHaveTextContent(
      "Total$ 4.000",
    );
    await user.click(
      screen.getByRole("button", { name: "Quitar Arcilla blanca 1 kg" }),
    );
    expect(screen.queryByRole("group", { name: "Resumen" })).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("drops the confirmation once the owner starts a new search", async () => {
    const { user } = await addArcilla();
    await user.type(screen.getByRole("searchbox"), "p");
    expect(screen.queryByText(/Agregado:/)).toBeNull();
  });
});

describe("EnrollmentNewMaterials", () => {
  it("asks to type before listing anything, so the catalog never floods a phone", () => {
    renderMaterials();
    expect(
      screen.getByRole("group", { name: "Materiales (opcional)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Escribí para buscar.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Agregar/ })).toBeNull();
  });

  it("filters by text over the material name and the variant label, ignoring case and accents", async () => {
    const user = userEvent.setup();
    renderMaterials();
    const search = screen.getByRole("searchbox", { name: "Buscar material" });
    await user.type(search, "ARCILLA");
    expect(screen.getAllByRole("button", { name: /^Agregar/ })).toHaveLength(2);
    await user.clear(search);
    await user.type(search, "5 kg");
    expect(
      screen.getByRole("button", { name: "Agregar Arcilla blanca 5 kg" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Agregar/ })).toHaveLength(1);
    await user.clear(search);
    await user.type(search, "numero");
    expect(
      screen.getByRole("button", { name: "Agregar Pincel Número 4" }),
    ).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "zzz");
    expect(
      screen.getByText("No hay materiales con ese nombre."),
    ).toBeInTheDocument();
  });

  it("shows name, variant label and price on each result", async () => {
    const user = userEvent.setup();
    renderMaterials();
    await user.type(screen.getByRole("searchbox"), "pincel");
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Pincel");
    expect(item).toHaveTextContent("Número 4");
    expect(item).toHaveTextContent("$ 1.500");
  });

  it("adds a variant with quantity 1, posts it, and takes it out of the results", async () => {
    const user = userEvent.setup();
    const { container } = renderMaterials();
    await user.type(screen.getByRole("searchbox"), "arcilla");
    await user.click(
      screen.getByRole("button", { name: "Agregar Arcilla blanca 1 kg" }),
    );
    const quantity = screen.getByRole("spinbutton", {
      name: "Cantidad de Arcilla blanca 1 kg",
    });
    expect(quantity).toHaveValue(1);
    expect(quantity).toHaveAttribute("name", "line:m-1:v-1");
    expect(quantity).toHaveAttribute("min", "1");
    expect(quantity).toHaveAttribute("max", "20");
    expect(
      screen.queryByRole("button", { name: "Agregar Arcilla blanca 1 kg" }),
    ).toBeNull();
    await user.clear(quantity);
    await user.type(quantity, "3");
    expect(posted(container)).toMatchObject({ "line:m-1:v-1": "3" });
  });

  it("removes a chosen variant so it is no longer posted", async () => {
    const user = userEvent.setup();
    const { container } = renderMaterials();
    await user.type(screen.getByRole("searchbox"), "pincel");
    await user.click(screen.getByRole("button", { name: /^Agregar Pincel/ }));
    await user.click(
      screen.getByRole("button", { name: "Quitar Pincel Número 4" }),
    );
    expect(posted(container)).toEqual({});
  });

  it("posts nothing when no material was chosen", () => {
    const { container } = renderMaterials();
    expect(posted(container)).toEqual({});
  });

  it("does not submit the form when Enter is pressed in the search box", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderMaterials();
    await user.type(screen.getByRole("searchbox"), "arcilla{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the fee, the materials and one total once something is chosen", async () => {
    const user = userEvent.setup();
    renderMaterials();
    expect(screen.queryByRole("group", { name: "Resumen" })).toBeNull();
    await user.type(screen.getByRole("searchbox"), "arcilla");
    await user.click(
      screen.getByRole("button", { name: "Agregar Arcilla blanca 1 kg" }),
    );
    const quantity = screen.getByRole("spinbutton", {
      name: /Arcilla blanca 1 kg/,
    });
    await user.clear(quantity);
    await user.type(quantity, "2");
    const summary = screen.getByRole("group", { name: "Resumen" });
    expect(within(summary).getByText("Cuota")).toBeInTheDocument();
    expect(summary).toHaveTextContent("Cuota$ 40.000");
    expect(summary).toHaveTextContent("Materiales$ 8.000");
    expect(summary).toHaveTextContent("Total$ 48.000");
  });

  it("adds a material to a zero fee: the total is the materials", async () => {
    const user = userEvent.setup();
    renderMaterials({ fee: "0" });
    await user.type(screen.getByRole("searchbox"), "pincel");
    await user.click(screen.getByRole("button", { name: /^Agregar Pincel/ }));
    expect(screen.getByRole("group", { name: "Resumen" })).toHaveTextContent(
      "Total$ 1.500",
    );
  });

  it("leaves the total out while the fee is not a readable amount", async () => {
    const user = userEvent.setup();
    renderMaterials({ fee: "abc" });
    await user.type(screen.getByRole("searchbox"), "pincel");
    await user.click(screen.getByRole("button", { name: /^Agregar Pincel/ }));
    const summary = screen.getByRole("group", { name: "Resumen" });
    expect(summary).toHaveTextContent("Materiales$ 1.500");
    expect(summary).not.toHaveTextContent("Total");
  });

  it("shows again the lines of a refused submit, even one that left the catalog", () => {
    const { container } = renderMaterials({
      initialLines: [
        { materialId: "m-2", variantId: "v-3", quantity: "0" },
        { materialId: "m-9", variantId: "v-9", quantity: "2" },
      ],
      error: "Cada material lleva entre 1 y 20 unidades enteras.",
    });
    expect(
      screen.getByRole("spinbutton", { name: "Cantidad de Pincel Número 4" }),
    ).toHaveValue(0);
    expect(
      screen.getByText("Material que ya no está disponible"),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cada material lleva entre 1 y 20 unidades enteras.",
    );
    expect(posted(container)).toMatchObject({
      "line:m-2:v-3": "0",
      "line:m-9:v-9": "2",
    });
  });

  it("explains an empty catalog and posts nothing", () => {
    const { container } = renderMaterials({ choices: [] });
    expect(
      screen.getByText("No hay materiales con precio."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(posted(container)).toEqual({});
  });

  it("has no accessibility violations with results and chosen lines", async () => {
    const user = userEvent.setup();
    const { container } = renderMaterials();
    await user.type(screen.getByRole("searchbox"), "arcilla");
    await user.click(
      screen.getByRole("button", { name: "Agregar Arcilla blanca 1 kg" }),
    );
    await expectNoAxeViolations(container);
  });
});
