import { describe, expect, it } from "vitest";
import { formatPesos } from "~/app/catalog/format";
import { Money } from "~/modules/_shared";
import type { SaleVariantOption } from "~/modules/materials";
import type { IntensiveProject } from "~/modules/workshops";
import {
  materialChoices,
  materialIssueMessage,
  materialRuleMessage,
  parseMaterialDraft,
  parseProjectDirection,
  parseProjectDraft,
  parseProjectId,
  parseQuantity,
  parseVariantId,
  projectCards,
  rejectedProject,
} from "./intensive-project-form-data";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
};

const project = (id: string, name: string): IntensiveProject => ({
  id,
  intensiveId: "i1",
  position: 0,
  name,
  image: null,
  price: pesos(30000),
  deposit: pesos(10000),
  audit: { updatedBy: "a@x.test", updatedAt: new Date("2026-11-02T12:00:00Z") },
});

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("parseProjectDraft", () => {
  it("reads the typed fields and the chosen image", () => {
    expect(
      parseProjectDraft(
        form({
          name: "Taza",
          price: "30000",
          deposit: "10000",
          imageAssetId: "a1",
          imageSrc: "/i.webp",
          imageAlt: "Una taza",
        }),
      ),
    ).toEqual({
      name: "Taza",
      price: "30000",
      deposit: "10000",
      image: { assetId: "a1", alt: "Una taza" },
    });
  });

  it("has no image when none was chosen, even if an alt text was typed", () => {
    expect(
      parseProjectDraft(form({ name: "Taza", price: "1", deposit: "1" })).image,
    ).toBeNull();
    expect(
      parseProjectDraft(
        form({ name: "Taza", price: "1", deposit: "1", imageAlt: "x" }),
      ).image,
    ).toBeNull();
  });

  it("drops the image when the owner asked to remove it", () => {
    expect(
      parseProjectDraft(
        form({
          name: "Taza",
          price: "1",
          deposit: "1",
          imageAssetId: "a1",
          imageAlt: "Una taza",
          removeImage: "on",
        }),
      ).image,
    ).toBeNull();
  });

  it("reads missing fields as empty text", () => {
    expect(parseProjectDraft(new FormData())).toEqual({
      name: "",
      price: "",
      deposit: "",
      image: null,
    });
  });
});

describe("project ids and directions", () => {
  it("reads the project id, empty when absent", () => {
    expect(parseProjectId(form({ projectId: "p1" }))).toBe("p1");
    expect(parseProjectId(new FormData())).toBe("");
  });

  it("accepts only up and down", () => {
    expect(parseProjectDirection(form({ direction: "up" }))).toBe("up");
    expect(parseProjectDirection(form({ direction: "down" }))).toBe("down");
    expect(parseProjectDirection(form({ direction: "left" }))).toBeNull();
    expect(parseProjectDirection(new FormData())).toBeNull();
  });
});

describe("rejectedProject", () => {
  it("keeps what was typed, shows the chosen image and words each issue", () => {
    const data = form({
      name: "",
      price: "1000",
      deposit: "2000",
      imageAssetId: "a1",
      imageSrc: "/i.webp",
      imageAlt: "",
    });

    const rejected = rejectedProject("p2", parseProjectDraft(data), data, [
      { field: "name", code: "required" },
      { field: "deposit", code: "exceeds-price" },
      { field: "image", code: "required" },
    ]);

    expect(rejected).toEqual({
      target: "p2",
      values: {
        name: "",
        price: "1000",
        deposit: "2000",
        image: { assetId: "a1", src: "/i.webp", alt: "" },
      },
      errors: {
        name: "Completá este campo.",
        deposit: "No puede superar el precio.",
        image: "Describí la imagen en el texto alternativo.",
      },
      formError: "Revisá los campos marcados e intentá de nuevo.",
    });
  });

  it("explains an image that no longer exists", () => {
    const data = form({ imageAssetId: "gone", imageAlt: "x" });

    const rejected = rejectedProject("new", parseProjectDraft(data), data, [
      { field: "image", code: "unknown-reference" },
    ]);

    expect(rejected.errors.image).toBe(
      "La imagen ya no existe. Volvé a subirla.",
    );
  });
});

const variant = (
  variantId: string,
  materialName: string,
  variantLabel: string,
): SaleVariantOption => ({
  materialId: `m-${variantId}`,
  variantId,
  materialName,
  variantLabel,
  unitPrice: Money.zero(),
});

describe("bill of materials form data", () => {
  it("reads the variant and the quantity as typed, empty when absent", () => {
    expect(
      parseMaterialDraft(form({ variantId: "v1", quantity: " 3 " })),
    ).toEqual({ variantId: "v1", quantity: " 3 " });
    expect(parseMaterialDraft(form({}))).toEqual({
      variantId: "",
      quantity: "",
    });
    expect(parseVariantId(form({ variantId: "v9" }))).toBe("v9");
    expect(parseQuantity(form({ quantity: "4" }))).toBe("4");
    expect(parseQuantity(form({}))).toBe("");
  });

  it("offers the catalog variants with the units on hand, or none when stock could not be read", () => {
    const variants = [
      variant("v1", "Arcilla blanca", "5 kg"),
      variant("v2", "Esmalte", "Celeste"),
    ];

    expect(materialChoices(variants, new Map([["v1", 7]]))).toEqual([
      { variantId: "v1", name: "Arcilla blanca", label: "5 kg", onHand: 7 },
      { variantId: "v2", name: "Esmalte", label: "Celeste", onHand: 0 },
    ]);
    expect(
      materialChoices(variants, null).map((choice) => choice.onHand),
    ).toEqual([null, null]);
  });

  it("puts each project's lines on its card, named from the catalog and flagged when the variant is gone", () => {
    const choices = materialChoices(
      [variant("v1", "Arcilla blanca", "5 kg")],
      new Map([["v1", 7]]),
    );
    const projects = [project("p1", "Taza"), project("p2", "Plato")];
    const lines = [
      { projectId: "p1", variantId: "v1", quantity: 2, position: 0 },
      { projectId: "p1", variantId: "v-gone", quantity: 1, position: 1 },
    ];

    const [taza, plato] = projectCards(projects, lines, choices);

    expect(taza?.materials).toEqual([
      {
        variantId: "v1",
        name: "Arcilla blanca",
        label: "5 kg",
        quantity: 2,
        onHand: 7,
      },
      {
        variantId: "v-gone",
        name: null,
        label: null,
        quantity: 1,
        onHand: null,
      },
    ]);
    expect(plato?.materials).toEqual([]);
  });

  it("keeps the cards of the existing project fields unchanged", () => {
    const [card] = projectCards([project("p1", "Taza")]);

    expect(card).toMatchObject({
      id: "p1",
      name: "Taza",
      amounts: {
        price: formatPesos(pesos(30000)),
        deposit: formatPesos(pesos(10000)),
      },
      image: null,
      values: { name: "Taza", price: "30000", deposit: "10000", image: null },
      materials: [],
    });
  });

  it("words a refused line in the owner's terms, one message per cause", () => {
    expect(
      materialIssueMessage([{ field: "quantity", code: "out-of-range" }]),
    ).toBe("La cantidad tiene que ser un número entero de 1 a 20.");
    expect(
      materialIssueMessage([
        { field: "variantId", code: "unknown-reference" },
        { field: "quantity", code: "required" },
      ]),
    ).toBe("Ese material no está disponible en el catálogo.");
    expect(materialRuleMessage(["duplicate-variant"])).toBe(
      "Ese material ya está en la lista de este proyecto. Cambiá su cantidad.",
    );
  });
});
