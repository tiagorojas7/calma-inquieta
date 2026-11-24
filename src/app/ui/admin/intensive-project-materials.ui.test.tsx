import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  ProjectMaterials,
  type ProjectMaterialChoice,
  type ProjectMaterialLine,
} from "./intensive-project-materials";

const arcilla: ProjectMaterialLine = {
  variantId: "v-arcilla",
  name: "Arcilla blanca",
  label: "5 kg",
  quantity: 2,
  onHand: 7,
};
const esmalte: ProjectMaterialLine = {
  variantId: "v-esmalte",
  name: "Esmalte",
  label: "Celeste",
  quantity: 1,
  onHand: 0,
};
const choices: readonly ProjectMaterialChoice[] = [
  { variantId: "v-arcilla", name: "Arcilla blanca", label: "5 kg", onHand: 7 },
  { variantId: "v-esmalte", name: "Esmalte", label: "Celeste", onHand: 0 },
  { variantId: "v-barniz", name: "Barniz", label: "1 L", onHand: 3 },
  { variantId: "v-torno", name: "Arcilla roja", label: "10 kg", onHand: null },
];

function renderMaterials(
  props: Partial<Parameters<typeof ProjectMaterials>[0]> = {},
) {
  return render(
    <ProjectMaterials
      projectId="p1"
      projectName="Taza de torno"
      lines={[]}
      choices={choices}
      {...props}
    />,
  );
}

const hidden = (form: Element | null, name: string) =>
  form?.querySelector<HTMLInputElement>(`input[name=${name}]`)?.value;

describe("ProjectMaterials", () => {
  it("explains that the materials are included and that the list is empty", () => {
    renderMaterials();

    expect(
      screen.getByText("Materiales por participante", { selector: "p" }),
    ).toBeVisible();
    expect(
      screen.getByText(/incluidos en el precio del proyecto/),
    ).toBeVisible();
    expect(
      screen.getByText("Este proyecto todavía no tiene materiales."),
    ).toBeVisible();
  });

  it("shows each line with its variant, quantity and units on hand for information", () => {
    renderMaterials({ lines: [arcilla, esmalte] });

    const group = screen.getByRole("group", {
      name: "Materiales de Taza de torno",
    });
    expect(within(group).getByText("Arcilla blanca")).toBeVisible();
    expect(within(group).getByText(/5 kg/)).toBeVisible();
    expect(within(group).getByText(/En stock: 7/)).toBeVisible();
    expect(within(group).getByText(/En stock: 0/)).toBeVisible();
    expect(
      within(group).getByRole("spinbutton", {
        name: "Cantidad de Arcilla blanca 5 kg",
      }),
    ).toHaveValue(2);
    expect(
      within(group).getByRole("spinbutton", {
        name: "Cantidad de Esmalte Celeste",
      }),
    ).toHaveValue(1);
  });

  it("changes a quantity with a native post form that names the project and variant", () => {
    renderMaterials({ lines: [arcilla] });

    const save = screen.getByRole("button", {
      name: "Guardar cantidad de Arcilla blanca 5 kg",
    });
    const form = save.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(hidden(form, "intent")).toBe("project-material-set");
    expect(hidden(form, "projectId")).toBe("p1");
    expect(hidden(form, "variantId")).toBe("v-arcilla");
    expect(
      form?.querySelector<HTMLInputElement>("input[name=quantity]"),
    ).toHaveValue(2);
  });

  it("removes a line with a native post form", () => {
    renderMaterials({ lines: [arcilla] });

    const remove = screen.getByRole("button", {
      name: "Quitar Arcilla blanca 5 kg de Taza de torno",
    });
    const form = remove.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(hidden(form, "intent")).toBe("project-material-remove");
    expect(hidden(form, "projectId")).toBe("p1");
    expect(hidden(form, "variantId")).toBe("v-arcilla");
  });

  it("labels a variant that left the catalog and still lets the owner remove it", () => {
    renderMaterials({
      lines: [
        {
          variantId: "v-gone",
          name: null,
          label: null,
          quantity: 3,
          onHand: null,
        },
      ],
    });

    expect(
      screen.getByText("Material no disponible en el catálogo"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Quitar Material no disponible en el catálogo de Taza de torno",
      }),
    ).toBeVisible();
  });

  it("searches the catalog by name or measure, ignoring accents, and hides variants already listed", async () => {
    const user = userEvent.setup();
    renderMaterials({ lines: [arcilla] });
    await user.click(screen.getByText("Agregar material"));

    expect(
      screen.getByText("Escribí para buscar en el catálogo."),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Buscar material"), "ARCILLA");
    expect(
      screen.getByRole("button", { name: "Agregar Arcilla roja 10 kg" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Agregar Arcilla blanca 5 kg" }),
    ).toBeNull();

    await user.clear(screen.getByLabelText("Buscar material"));
    await user.type(screen.getByLabelText("Buscar material"), "1 l");
    expect(
      screen.getByRole("button", { name: "Agregar Barniz 1 L" }),
    ).toBeVisible();

    await user.clear(screen.getByLabelText("Buscar material"));
    await user.type(screen.getByLabelText("Buscar material"), "zzz");
    expect(
      screen.getByText("No encontramos materiales con ese nombre."),
    ).toBeVisible();
  });

  it("adds a found variant with a native post form carrying the typed quantity", async () => {
    const user = userEvent.setup();
    renderMaterials();
    await user.click(screen.getByText("Agregar material"));
    await user.type(screen.getByLabelText("Buscar material"), "barniz");

    const add = screen.getByRole("button", { name: "Agregar Barniz 1 L" });
    const form = add.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(hidden(form, "intent")).toBe("project-material-add");
    expect(hidden(form, "projectId")).toBe("p1");
    expect(hidden(form, "variantId")).toBe("v-barniz");
    expect(
      form?.querySelector<HTMLInputElement>("input[name=quantity]"),
    ).toHaveValue(1);
  });

  it("says so when the catalog has nothing to add and shows a refusal as an alert", () => {
    renderMaterials({
      choices: [],
      error: "Ese material ya está en la lista.",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ese material ya está en la lista.",
    );
    expect(
      screen.getByText("No hay materiales en el catálogo para agregar."),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderMaterials({ lines: [arcilla, esmalte] });

    await expectNoAxeViolations(container);
  });
});
