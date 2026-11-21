import { describe, expect, it } from "vitest";
import type { MaterialStockRow } from "~/modules/materials";
import {
  catalogAnchor,
  catalogSearch,
  materialAnchor,
  parseSearchText,
  studioCards,
  studioSearch,
} from "./material-stock-view";

const row = (overrides: Partial<MaterialStockRow> = {}): MaterialStockRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Arcilla",
  category: "Arcillas",
  supplierName: "Casa Pincel",
  active: true,
  available: true,
  keptInStudio: true,
  onHand: 3,
  variants: [
    { id: "v1", label: "Única", price: 1500, available: true, onHand: 3 },
  ],
  ...overrides,
});

describe("search parsing", () => {
  it("trims and bounds the search text", () => {
    expect(parseSearchText(null)).toBe("");
    expect(parseSearchText("  arcilla ")).toBe("arcilla");
    expect(parseSearchText("x".repeat(200))).toHaveLength(80);
  });

  it("builds an anchor that stayOnPage accepts", () => {
    expect(materialAnchor("11111111-1111-4111-8111-111111111111")).toMatch(
      /^[A-Za-z][A-Za-z0-9_-]{0,63}$/,
    );
    expect(catalogAnchor("11111111-1111-4111-8111-111111111111")).toMatch(
      /^[A-Za-z][A-Za-z0-9_-]{0,63}$/,
    );
  });

  it("gives the studio card and the catalog row of one material different ids", () => {
    expect(catalogAnchor("a")).not.toBe(materialAnchor("a"));
  });
});

describe("studio cards", () => {
  it("shows at most four studio materials until a name is searched", () => {
    const cards = studioCards(
      Array.from({ length: 6 }, (_, index) =>
        row({ id: `m${String(index)}`, name: `Arcilla ${String(index)}` }),
      ),
    );
    expect(studioSearch(cards, "").map((card) => card.name)).toEqual([
      "Arcilla 0",
      "Arcilla 1",
      "Arcilla 2",
      "Arcilla 3",
    ]);
    expect(studioSearch(cards, "arcilla 5").map((card) => card.name)).toEqual([
      "Arcilla 5",
    ]);
  });
  it("says Hay N with its price for a one-variant material", () => {
    const [card] = studioCards([row()]);
    expect(card).toMatchObject({
      name: "Arcilla",
      price: "$ 1.500",
      state: "hay",
      onHand: 3,
      variants: [],
      variantId: "v1",
    });
  });

  it("says Sin stock for zero units", () => {
    const [card] = studioCards([
      row({
        onHand: 0,
        variants: [
          {
            id: "v1",
            label: "Única",
            price: 1500,
            available: true,
            onHand: 0,
          },
        ],
      }),
    ]);
    expect(card).toMatchObject({ state: "sin", onHand: 0 });
  });

  it("lists the variants one line each, with their own state, and the lowest price", () => {
    const [card] = studioCards([
      row({
        onHand: 2,
        variants: [
          {
            id: "v1",
            label: "Rojo",
            price: 1800,
            available: true,
            onHand: 2,
          },
          {
            id: "v2",
            label: "Azul",
            price: 1500,
            available: true,
            onHand: 0,
          },
        ],
      }),
    ]);
    expect(card?.price).toBe("Desde $ 1.500");
    expect(card?.variantId).toBeUndefined();
    expect(card?.variants).toEqual([
      { id: "v1", label: "Rojo", state: "hay", onHand: 2 },
      { id: "v2", label: "Azul", state: "sin", onHand: 0 },
    ]);
  });

  it("shows a price on request in words", () => {
    const [card] = studioCards([
      row({
        variants: [
          {
            id: "v1",
            label: "Única",
            price: null,
            available: true,
            onHand: 1,
          },
        ],
      }),
    ]);
    expect(card?.price).toBe("Precio a consultar");
  });

  it("lists only the materials the studio keeps, in order, whatever their units", () => {
    const rows = [
      row({ id: "a", name: "Con" }),
      row({
        id: "b",
        name: "Se acabó",
        onHand: 0,
        variants: [
          { id: "v2", label: "Única", price: 1, available: true, onHand: 0 },
        ],
      }),
      row({ id: "c", name: "Se pide", keptInStudio: false }),
    ];
    expect(studioCards(rows).map((c) => [c.name, c.state])).toEqual([
      ["Con", "hay"],
      ["Se acabó", "sin"],
    ]);
  });
});

describe("catalog search", () => {
  const rows = [
    row({ id: "a", name: "Pincel plano", category: "Pinceles" }),
    row({
      id: "b",
      name: "Arcilla",
      category: "Barro",
      supplierName: "Álamo",
      keptInStudio: false,
    }),
  ];
  const find = (query: string) =>
    catalogSearch(rows, query).rows.map((c) => c.name);

  it("lists nothing until the owner searches, whatever the catalog holds", () => {
    expect(catalogSearch(rows, "")).toEqual({ rows: [], found: 0 });
    expect(catalogSearch(rows, "   ")).toEqual({ rows: [], found: 0 });
  });

  it("searches name, category and supplier without caring for case or accents", () => {
    expect(find("PINCEL")).toEqual(["Pincel plano"]);
    expect(find("alamo")).toEqual(["Arcilla"]);
    expect(find("barro")).toEqual(["Arcilla"]);
    expect(find("zzz")).toEqual([]);
  });

  it("gives each result its own anchor and whether the studio keeps it", () => {
    expect(catalogSearch(rows, "a").rows).toEqual([
      { id: "a", anchor: catalogAnchor("a"), name: "Pincel plano", kept: true },
      { id: "b", anchor: catalogAnchor("b"), name: "Arcilla", kept: false },
    ]);
  });

  it("shows a bounded number of results and says how many matched", () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      row({ id: `m${String(index)}`, name: `Hilo ${String(index)}` }),
    );
    const result = catalogSearch(many, "hilo");
    expect(result.rows).toHaveLength(4);
    expect(result.found).toBe(30);
  });
});
