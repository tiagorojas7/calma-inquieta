import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { MaterialForm } from "./material-form";

const empty = {
  name: "",
  description: "",
  category: "",
  supplierId: "",
  available: true,
  image: null,
  variants: [],
};

function renderForm(props: Partial<Parameters<typeof MaterialForm>[0]> = {}) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <MaterialForm
          values={empty}
          errors={{}}
          suppliers={[{ id: "s1", name: "Casa Pincel" }]}
          upload={vi.fn()}
          submitLabel="Guardar"
          cancelHref="/admin/materiales"
          {...props}
        />
      ),
    },
  ]);
  return render(<Stub />);
}

describe("MaterialForm", () => {
  it("renders a native document form with its default Única variant and image field", async () => {
    const { container } = renderForm();
    for (const label of [
      "Nombre",
      "Descripción",
      "Categoría",
      "Proveedor",
      "Disponible",
      "Imagen",
      "Variante",
      "Precio (en pesos)",
      "Color",
    ]) {
      expect(await screen.findByLabelText(label)).toBeVisible();
    }
    expect(screen.getByLabelText("Variante")).toHaveValue("Única");
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/materiales",
    );
    const form = screen.getByLabelText("Nombre").closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("novalidate");
    expect(fireEvent.submit(form as HTMLFormElement)).toBe(true);
    await expectNoAxeViolations(container);
  });

  it("keeps values, maps errors to fields, and offers an optional second variant", async () => {
    renderForm({
      values: {
        ...empty,
        name: "Arcilla",
        variants: [
          {
            label: "Única",
            price: "2000",
            swatch: "#765432",
            available: true,
          },
        ],
      },
      errors: {
        name: "Ya existe un material con ese nombre.",
        variants: { rows: [{ price: "Cada variante necesita un precio." }] },
        image: "La imagen necesita texto alternativo.",
      },
      formError: "Revisá los campos marcados e intentá de nuevo.",
    });
    expect(await screen.findByLabelText("Nombre")).toHaveValue("Arcilla");
    expect(screen.getByLabelText("Variante")).toHaveValue("Única");
    expect(screen.getByLabelText("Precio (en pesos)")).toHaveValue("2000");
    expect(screen.getByLabelText("Nombre")).toHaveAccessibleDescription(
      /Ya existe un material/,
    );
    expect(screen.getByText("Cada variante necesita un precio.")).toBeVisible();
    expect(
      screen.getByText("La imagen necesita texto alternativo."),
    ).toBeVisible();
    await screen.findByRole("button", { name: "Agregar variante" });
    fireEvent.click(screen.getByRole("button", { name: "Agregar variante" }));
    expect(screen.getAllByLabelText("Variante")).toHaveLength(2);
  });

  it("reorders and removes variants without losing a typed live value", async () => {
    renderForm({
      values: {
        ...empty,
        variants: [
          {
            id: "variant-small",
            label: "Chica",
            price: "1000",
            swatch: "",
            available: true,
          },
          {
            id: "variant-large",
            label: "Grande",
            price: "2000",
            swatch: "",
            available: true,
          },
        ],
      },
    });
    const labels = await screen.findAllByLabelText("Variante");
    const firstLabel = labels[0];
    if (!firstLabel) throw new Error("missing first variant");
    fireEvent.change(firstLabel, { target: { value: "Chica editada" } });
    const moveDown = screen.getAllByRole("button", {
      name: "Bajar variante",
    })[0];
    if (!moveDown) throw new Error("missing move button");
    fireEvent.click(moveDown);
    const reordered = screen.getAllByLabelText("Variante")[1];
    if (!reordered) throw new Error("missing reordered variant");
    expect(reordered).toHaveValue("Chica editada");
    expect(
      Array.from(document.querySelectorAll('input[name="variantId"]')).map(
        (input) => input.getAttribute("value"),
      ),
    ).toEqual(["variant-large", "variant-small"]);
    const remove = screen.getAllByRole("button", {
      name: "Quitar variante",
    })[1];
    if (!remove) throw new Error("missing remove button");
    fireEvent.click(remove);
    expect(screen.getAllByLabelText("Variante")).toHaveLength(1);
    expect(screen.getByLabelText("Variante")).toHaveValue("Grande");
  });

  it("maps label, price and swatch errors to the affected variant row", async () => {
    renderForm({
      values: {
        ...empty,
        variants: [{ label: "Única", price: "", swatch: "", available: true }],
      },
      errors: {
        variants: {
          rows: [
            {
              label: "Etiqueta repetida.",
              price: "Ingresá un monto en pesos enteros.",
              swatch: "Usá un color hexadecimal.",
            },
          ],
        },
      },
    });
    expect(
      await screen.findByLabelText("Variante"),
    ).toHaveAccessibleDescription("Etiqueta repetida.");
    expect(
      screen.getByLabelText("Precio (en pesos)"),
    ).toHaveAccessibleDescription(/Ingresá un monto/);
    expect(screen.getByLabelText("Color")).toHaveAccessibleDescription(
      "Usá un color hexadecimal.",
    );
  });

  it("renders a service-level variants error above its rows", async () => {
    renderForm({
      errors: {
        variants: { form: "Las variantes no pueden repetirse." },
      },
    });
    expect(
      await screen.findByText("Las variantes no pueden repetirse."),
    ).toHaveAttribute("role", "alert");
  });

  it("keeps an image asset and alt as hidden fields when its preview is unavailable", async () => {
    const { container } = renderForm({
      values: {
        ...empty,
        image: { assetId: "image-kept", src: "", alt: "Frasco de pintura" },
      },
    });
    expect(await screen.findByLabelText("Imagen")).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector('input[name="imageAssetId"]')).toHaveValue(
      "image-kept",
    );
    expect(container.querySelector('input[name="imageAlt"]')).toHaveValue(
      "Frasco de pintura",
    );
  });
});
