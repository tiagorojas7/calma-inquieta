import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  EMPTY_QUICK_VALUES,
  MaterialQuickForm,
  type MaterialQuickErrors,
  type MaterialQuickValues,
} from "./material-quick-form";

const upload = vi.fn();
const one = [{ id: "s1", name: "Casa Pincel" }];
const two = [...one, { id: "s2", name: "Papelería Sur" }];

function view(
  overrides: {
    values?: Partial<MaterialQuickValues>;
    errors?: MaterialQuickErrors;
    suppliers?: readonly { id: string; name: string }[];
    formError?: string;
  } = {},
) {
  return render(
    <MaterialQuickForm
      values={{ ...EMPTY_QUICK_VALUES, ...overrides.values }}
      errors={overrides.errors ?? {}}
      formError={overrides.formError}
      suppliers={overrides.suppliers ?? one}
      upload={upload}
      cancelHref="/admin/materiales"
    />,
  );
}

const more = () => screen.getByText("Más opciones").closest("details");

describe("MaterialQuickForm", () => {
  it("asks only for name, price and how many, with one Guardar", () => {
    const { container } = view();
    expect(screen.getByLabelText("Nombre")).toBeVisible();
    expect(screen.getByLabelText("Precio")).toBeVisible();
    expect(screen.getByLabelText("¿Cuántos hay?")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Guardar" })).toHaveLength(1);
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
    expect(more()).not.toHaveAttribute("open");
  });

  it("keeps supplier, cost, variants, photo, price on request and availability behind Más opciones", () => {
    view();
    const inside = within(more() as HTMLElement);
    for (const label of [
      "Proveedor",
      "Costo",
      "Precio a consultar",
      "Disponible",
      "Foto",
    ])
      expect(inside.getByLabelText(label)).toBeInTheDocument();
    expect(
      inside.getByRole("button", { name: "Agregar variante" }),
    ).toBeInTheDocument();
    const visibleTop = screen
      .getAllByRole("textbox")
      .filter((field) => !(more() as HTMLElement).contains(field));
    expect(visibleTop.map((field) => field.getAttribute("name"))).toEqual([
      "name",
      "variantPrice",
      "startingStock",
    ]);
  });

  it("posts the first variant as Única with the price field at the top", () => {
    const { container } = view();
    expect(container.querySelector('[name="variantLabel"]')).toHaveValue(
      "Única",
    );
    expect(screen.getByLabelText("Precio")).toHaveAttribute(
      "name",
      "variantPrice",
    );
    expect(screen.getByLabelText("¿Cuántos hay?")).toHaveAttribute(
      "name",
      "startingStock",
    );
  });

  it("preselects the supplier only when there is exactly one", () => {
    const { unmount } = view({ suppliers: one });
    expect(screen.getByLabelText("Proveedor")).toHaveValue("s1");
    unmount();
    view({ suppliers: two });
    expect(screen.getByLabelText("Proveedor")).toHaveValue("");
  });

  it("opens Más opciones by itself when a hidden field failed", () => {
    view({ errors: { supplierId: "Completá este campo." } });
    expect(more()).toHaveAttribute("open");
    expect(screen.getByText("Completá este campo.")).toBeVisible();
  });

  it("stays closed when only a visible field failed, and shows its message", () => {
    view({
      errors: {
        name: "Completá este campo.",
        stock: "Escribí un número entero, por ejemplo 5.",
      },
    });
    expect(more()).not.toHaveAttribute("open");
    expect(screen.getByText("Completá este campo.")).toBeVisible();
    expect(
      screen.getByText("Escribí un número entero, por ejemplo 5."),
    ).toBeVisible();
  });

  it("keeps what was typed after a refusal and shows the form error", () => {
    view({
      values: { name: "Pintura", price: "1200", stock: "x" },
      formError: "No pudimos guardar. Revisá los campos.",
    });
    expect(screen.getByLabelText("Nombre")).toHaveValue("Pintura");
    expect(screen.getByLabelText("Precio")).toHaveValue("1200");
    expect(screen.getByLabelText("¿Cuántos hay?")).toHaveValue("x");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos guardar. Revisá los campos.",
    );
  });

  it("adds and removes extra variants, each posting its own name, price and cost", () => {
    const { container } = view();
    const add = screen.getByRole("button", { name: "Agregar variante" });
    fireEvent.click(add);
    fireEvent.click(add);
    expect(screen.getAllByLabelText("Nombre de la variante")).toHaveLength(2);
    fireEvent.change(
      screen.getAllByLabelText("Nombre de la variante")[1] as HTMLElement,
      {
        target: { value: "Azul" },
      },
    );
    expect(
      [...container.querySelectorAll('[name="variantLabel"]')].map(
        (field) => (field as HTMLInputElement).value,
      ),
    ).toEqual(["Única", "", "Azul"]);
    expect(
      [...container.querySelectorAll('[name="variantAvailable"]')].map(
        (field) => (field as HTMLInputElement).value,
      ),
    ).toEqual(["0", "1", "2"]);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Quitar variante",
      })[0] as HTMLElement,
    );
    expect(screen.getAllByLabelText("Nombre de la variante")).toHaveLength(1);
    expect(screen.getByLabelText("Nombre de la variante")).toHaveValue("Azul");
  });

  it("opens Más opciones for an error on an extra variant and shows it on its row", () => {
    view({
      values: { extras: [{ label: "grande", price: "1", cost: "" }] },
      errors: { extras: [{ label: "Ya hay otra variante con ese nombre." }] },
    });
    expect(more()).toHaveAttribute("open");
    expect(
      screen.getByText("Ya hay otra variante con ese nombre."),
    ).toBeVisible();
  });

  it("links Cancelar back to Materiales", () => {
    view();
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/materiales",
    );
  });

  it("has no accessibility violations, closed or open with errors", async () => {
    const closed = view();
    await expectNoAxeViolations(closed.container);
    closed.unmount();
    const open = view({
      errors: {
        supplierId: "Completá este campo.",
        name: "Completá este campo.",
      },
      values: { extras: [{ label: "A", price: "1", cost: "" }] },
    });
    await expectNoAxeViolations(open.container);
  });
});
