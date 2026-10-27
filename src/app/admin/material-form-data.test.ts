import { describe, expect, it } from "vitest";
import { materialFormErrors, parseMaterialDraft } from "./material-form-data";

function formOf(entries: Record<string, string | readonly string[] | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (value instanceof File) form.set(key, value);
    else if (typeof value === "string") form.set(key, value);
    else
      value.forEach((item) => {
        form.append(key, item);
      });
  }
  return form;
}

describe("parseMaterialDraft", () => {
  it("reads a material, its image and all variant rows without altering text", () => {
    expect(
      parseMaterialDraft(
        formOf({
          name: "  Acrílico azul ",
          description: " Para pintar ",
          category: " Pinturas ",
          supplierId: "s1",
          available: "on",
          imageAssetId: "image-1",
          imageAlt: "Pote azul",
          variantId: ["variant-1", ""],
          variantLabel: ["Única", "Grande"],
          variantPrice: ["1200", "2500"],
          variantSwatch: ["#112233", "#abcdef"],
          variantAvailable: ["0", "1"],
        }),
      ),
    ).toEqual({
      name: "  Acrílico azul ",
      description: " Para pintar ",
      category: " Pinturas ",
      supplierId: "s1",
      available: true,
      image: { assetId: "image-1", alt: "Pote azul" },
      variants: [
        {
          id: "variant-1",
          label: "Única",
          price: "1200",
          swatch: "#112233",
          available: true,
        },
        { label: "Grande", price: "2500", swatch: "#abcdef", available: true },
      ],
    });
  });

  it("keeps a persisted ID aligned after a new row", () => {
    expect(
      parseMaterialDraft(
        formOf({
          variantId: ["", "variant-existing"],
          variantLabel: ["Nueva", "Existente"],
          variantPrice: ["100", "200"],
          variantSwatch: ["", ""],
          variantAvailable: ["0", "1"],
        }),
      ),
    ).toMatchObject({
      variants: [
        { label: "Nueva" },
        { id: "variant-existing", label: "Existente" },
      ],
    });
  });

  it("uses one Única row by default and turns absent or file parts into safe values", () => {
    expect(
      parseMaterialDraft(formOf({ name: new File(["x"], "x.txt") })),
    ).toEqual({
      name: "",
      description: "",
      category: "",
      supplierId: "",
      available: false,
      image: null,
      variants: [{ label: "Única", price: "", swatch: "", available: true }],
    });
  });

  it("keeps a valid image when its preview source is dangling", () => {
    expect(
      parseMaterialDraft(
        formOf({
          imageAssetId: "image-kept",
          imageAlt: "Frasco de pintura",
          imageSrc: "/imagenes/removed.webp",
        }),
      ),
    ).toMatchObject({
      image: { assetId: "image-kept", alt: "Frasco de pintura" },
    });
  });
});

describe("materialFormErrors", () => {
  it("maps scalar and indexed variant issues to their individual fields", () => {
    expect(
      materialFormErrors([
        { field: "name", code: "required" },
        { field: "variants.1.label", code: "duplicate" },
        { field: "variants.1.price", code: "not-whole-pesos" },
        { field: "variants.1.swatch", code: "invalid-format" },
      ]),
    ).toEqual({
      name: "Completá este campo.",
      variants: {
        rows: [
          {},
          {
            label: "Ya existe uno activo con el mismo nombre.",
            price: "Ingresá un monto en pesos enteros.",
            swatch: "El formato no es válido. Revisalo.",
          },
        ],
      },
    });
  });

  it("keeps a generic service variants issue visible alongside indexed rows", () => {
    expect(
      materialFormErrors([
        { field: "variants", code: "duplicate" },
        { field: "variants", code: "out-of-range" },
        { field: "variants.0.price", code: "not-whole-pesos" },
      ]),
    ).toEqual({
      variants: {
        form: "Ya existe uno activo con el mismo nombre.",
        rows: [{ price: "Ingresá un monto en pesos enteros." }],
      },
    });
  });
});
