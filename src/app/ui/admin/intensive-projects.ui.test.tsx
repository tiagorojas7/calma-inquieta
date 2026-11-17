import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  IntensiveProjects,
  type IntensiveProjectCard,
} from "./intensive-projects";

const taza: IntensiveProjectCard = {
  id: "p1",
  name: "Taza de torno",
  amounts: { price: "$ 30.000", deposit: "$ 10.000" },
  image: { src: "/imagenes/taza.webp", alt: "Una taza" },
  values: {
    name: "Taza de torno",
    price: "30000",
    deposit: "10000",
    image: { assetId: "a1", src: "/imagenes/taza.webp", alt: "Una taza" },
  },
  materials: [
    {
      variantId: "v-arcilla",
      name: "Arcilla blanca",
      label: "5 kg",
      quantity: 2,
      onHand: 7,
    },
  ],
};
const plato: IntensiveProjectCard = {
  id: "p2",
  name: "Plato hondo",
  amounts: { price: "$ 45.000", deposit: "$ 15.000" },
  image: null,
  values: {
    name: "Plato hondo",
    price: "45000",
    deposit: "15000",
    image: null,
  },
  materials: [],
};

function listItem(index: number): HTMLElement {
  const item = screen.getAllByRole("listitem")[index];
  if (!item) throw new Error(`missing list item ${String(index)}`);
  return item;
}

function hidden(form: HTMLElement | null, name: string) {
  return form?.querySelector<HTMLInputElement>(`input[name=${name}]`)?.value;
}

describe("IntensiveProjects", () => {
  it("lists the projects in order with name, price, deposit and image", () => {
    render(<IntensiveProjects projects={[taza, plato]} />);

    const list = screen.getByRole("list", { name: "Proyectos" });
    const items = within(list).getAllByRole("listitem");
    const [firstItem, secondItem] = [listItem(0), listItem(1)];
    expect(items).toHaveLength(2);
    expect(within(firstItem).getByText("Taza de torno")).toBeVisible();
    expect(
      within(firstItem).getByText("Precio $ 30.000 · Seña $ 10.000"),
    ).toBeVisible();
    expect(
      within(firstItem).getByRole("img", { name: "Una taza" }),
    ).toBeVisible();
    expect(within(secondItem).getByText("Plato hondo")).toBeVisible();
    expect(within(secondItem).getByText("Sin imagen")).toBeVisible();
  });

  it("explains that a workshop needs a project when it has none", () => {
    render(<IntensiveProjects projects={[]} />);

    expect(
      screen.getByText(/Agregá uno para poder publicar el workshop/),
    ).toBeVisible();
    expect(screen.queryByRole("list", { name: "Proyectos" })).toBeNull();
  });

  it("moves a project with native post forms and disables the impossible moves", () => {
    render(<IntensiveProjects projects={[taza, plato]} />);

    expect(
      screen.getByRole("button", { name: "Subir Taza de torno" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Bajar Plato hondo" }),
    ).toBeDisabled();
    const down = screen.getByRole("button", { name: "Bajar Taza de torno" });
    expect(down).toBeEnabled();
    const form = down.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(hidden(form, "intent")).toBe("project-move");
    expect(hidden(form, "projectId")).toBe("p1");
    expect(hidden(form, "direction")).toBe("down");
    const up = screen.getByRole("button", { name: "Subir Plato hondo" });
    expect(hidden(up.closest("form"), "direction")).toBe("up");
    expect(hidden(up.closest("form"), "projectId")).toBe("p2");
  });

  it("edits a project in its own form, filled with what is stored", async () => {
    render(<IntensiveProjects projects={[taza, plato]} />);

    const item = listItem(0);
    await userEvent.click(within(item).getByText("Editar"));
    const form = within(item)
      .getByRole("button", { name: "Guardar proyecto" })
      .closest("form");
    expect(hidden(form, "intent")).toBe("project-save");
    expect(hidden(form, "projectId")).toBe("p1");
    expect(within(item).getByLabelText("Nombre del proyecto")).toHaveValue(
      "Taza de torno",
    );
    expect(within(item).getByLabelText("Precio total (en pesos)")).toHaveValue(
      "30000",
    );
    expect(within(item).getByLabelText("Seña (en pesos)")).toHaveValue("10000");
    expect(hidden(form, "imageAssetId")).toBe("a1");
    expect(
      within(item).getByRole("checkbox", { name: "Quitar la imagen" }),
    ).not.toBeChecked();
  });

  it("offers no way to remove an image a project does not have", () => {
    render(<IntensiveProjects projects={[plato]} />);

    expect(
      screen.queryByRole("checkbox", { name: "Quitar la imagen" }),
    ).toBeNull();
  });

  it("adds a project from a separate form", async () => {
    render(<IntensiveProjects projects={[taza]} />);

    await userEvent.click(screen.getByText("Nuevo proyecto"));
    const form = screen
      .getByRole("button", { name: "Agregar proyecto" })
      .closest("form");

    expect(hidden(form, "intent")).toBe("project-add");
    expect(hidden(form, "projectId")).toBeUndefined();
  });

  it("asks before deleting and names the project", async () => {
    render(<IntensiveProjects projects={[taza, plato]} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar Plato hondo" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("¿Eliminar el proyecto?")).toBeVisible();
    expect(
      within(dialog).getByText(/Se elimina "Plato hondo" de este workshop/),
    ).toBeVisible();
  });

  it("shows what was typed and the field errors on the form that was refused", () => {
    render(
      <IntensiveProjects
        projects={[taza, plato]}
        rejected={{
          target: "p2",
          values: { name: "", price: "1000", deposit: "2000", image: null },
          errors: {
            name: "Completá este campo.",
            deposit: "No puede superar el precio.",
          },
          formError: "Revisá los campos marcados e intentá de nuevo.",
        }}
      />,
    );

    const item = listItem(1);
    expect(within(item).getByLabelText("Nombre del proyecto")).toHaveValue("");
    expect(within(item).getByLabelText("Precio total (en pesos)")).toHaveValue(
      "1000",
    );
    expect(within(item).getByLabelText("Seña (en pesos)")).toHaveValue("2000");
    expect(within(item).getByText("Completá este campo.")).toBeVisible();
    expect(within(item).getByText("No puede superar el precio.")).toBeVisible();
    expect(within(item).getByText("Guardar proyecto")).toBeVisible();
  });

  it("shows the errors of a refused new project in the add form", () => {
    render(
      <IntensiveProjects
        projects={[taza]}
        rejected={{
          target: "new",
          values: { name: "Nuevo", price: "abc", deposit: "1", image: null },
          errors: { price: "El formato no es válido. Revisalo." },
        }}
      />,
    );

    const form = screen
      .getByRole("button", { name: "Agregar proyecto" })
      .closest("form");
    if (!form) throw new Error("missing add form");
    expect(within(form).getByLabelText("Nombre del proyecto")).toHaveValue(
      "Nuevo",
    );
    expect(within(form).getByLabelText("Precio total (en pesos)")).toHaveValue(
      "abc",
    );
    expect(
      within(form).getByText("El formato no es válido. Revisalo."),
    ).toBeVisible();
  });

  it("shows a refused delete as an alert", () => {
    render(
      <IntensiveProjects
        projects={[taza]}
        error="No se puede eliminar: ya hay solicitudes que eligieron este proyecto."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "ya hay solicitudes que eligieron este proyecto",
    );
  });

  it("gives every project its own bill of materials and shows a refused line only on its project", () => {
    render(
      <IntensiveProjects
        projects={[taza, plato]}
        materialChoices={[
          { variantId: "v-barniz", name: "Barniz", label: "1 L", onHand: 3 },
        ]}
        rejectedMaterial={{
          projectId: "p2",
          message: "Ese material ya está en la lista de este proyecto.",
        }}
      />,
    );

    const first = within(
      screen.getByRole("group", { name: "Materiales de Taza de torno" }),
    );
    expect(first.getByText("Arcilla blanca")).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Materiales de Plato hondo" }),
    ).toBeNull();
    expect(
      within(listItem(1)).getByText(
        "Este proyecto todavía no tiene materiales.",
      ),
    ).toBeVisible();
    expect(within(listItem(1)).getByRole("alert")).toHaveTextContent(
      "Ese material ya está en la lista de este proyecto.",
    );
    expect(within(listItem(0)).queryByRole("alert")).toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <IntensiveProjects projects={[taza, plato]} />,
    );

    await expectNoAxeViolations(container);
  });
});
