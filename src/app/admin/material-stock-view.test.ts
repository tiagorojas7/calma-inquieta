import { describe, expect, it } from "vitest";
import type { MaterialStockRow } from "~/modules/materials";
import {
  materialAnchor,
  parseSearchText,
  parseStockFilter,
  stockCards,
} from "./material-stock-view";

const row = (overrides: Partial<MaterialStockRow> = {}): MaterialStockRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Arcilla",
  category: "Arcillas",
  supplierName: "Casa Pincel",
  active: true,
  available: true,
  onHand: 3,
  variants: [
    { id: "v1", label: "Única", price: 1500, available: true, onHand: 3 },
  ],
  ...overrides,
});

describe("stock filter and search parsing", () => {
  it("defaults to todos and accepts only the three keys", () => {
    expect(parseStockFilter(null)).toBe("todos");
    expect(parseStockFilter("nope")).toBe("todos");
    expect(parseStockFilter("hay")).toBe("hay");
    expect(parseStockFilter("sin")).toBe("sin");
    expect(parseStockFilter("todos")).toBe("todos");
  });

  it("trims and bounds the search text", () => {
    expect(parseSearchText(null)).toBe("");
    expect(parseSearchText("  arcilla ")).toBe("arcilla");
    expect(parseSearchText("x".repeat(200))).toHaveLength(80);
  });

  it("builds an anchor that stayOnPage accepts", () => {
    expect(materialAnchor("11111111-1111-4111-8111-111111111111")).toMatch(
      /^[A-Za-z][A-Za-z0-9_-]{0,63}$/,
    );
  });
});

describe("stock cards", () => {
  it("says Hay N with its price for a one-variant material", () => {
    const [card] = stockCards([row()], { filter: "todos", query: "" });
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
    const [card] = stockCards(
      [
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
      ],
      { filter: "todos", query: "" },
    );
    expect(card).toMatchObject({ state: "sin", onHand: 0 });
  });

  it("lists the variants one line each, with their own state, and the lowest price", () => {
    const [card] = stockCards(
      [
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
      ],
      { filter: "todos", query: "" },
    );
    expect(card?.price).toBe("Desde $ 1.500");
    expect(card?.variantId).toBeUndefined();
    expect(card?.variants).toEqual([
      { id: "v1", label: "Rojo", state: "hay", onHand: 2 },
      { id: "v2", label: "Azul", state: "sin", onHand: 0 },
    ]);
  });

  it("shows a price on request in words", () => {
    const [card] = stockCards(
      [
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
      ],
      { filter: "todos", query: "" },
    );
    expect(card?.price).toBe("Precio a consultar");
  });

  it("keeps only materials with units for Hay and only those without for Sin stock", () => {
    const rows = [
      row({ id: "a", name: "Con" }),
      row({
        id: "b",
        name: "Sin",
        onHand: 0,
        variants: [
          { id: "v2", label: "Única", price: 1, available: true, onHand: 0 },
        ],
      }),
    ];
    expect(
      stockCards(rows, { filter: "hay", query: "" }).map((c) => c.name),
    ).toEqual(["Con"]);
    expect(
      stockCards(rows, { filter: "sin", query: "" }).map((c) => c.name),
    ).toEqual(["Sin"]);
    expect(
      stockCards(rows, { filter: "todos", query: "" }).map((c) => c.name),
    ).toEqual(["Con", "Sin"]);
  });

  it("searches name, category and supplier without caring for case or accents", () => {
    const rows = [
      row({ id: "a", name: "Pincel plano", category: "Pinceles" }),
      row({
        id: "b",
        name: "Arcilla",
        category: "Barro",
        supplierName: "Álamo",
      }),
    ];
    const find = (query: string) =>
      stockCards(rows, { filter: "todos", query }).map((c) => c.name);
    expect(find("PINCEL")).toEqual(["Pincel plano"]);
    expect(find("alamo")).toEqual(["Arcilla"]);
    expect(find("barro")).toEqual(["Arcilla"]);
    expect(find("zzz")).toEqual([]);
  });
});
