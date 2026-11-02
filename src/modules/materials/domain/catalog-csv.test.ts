import { describe, expect, it } from "vitest";
import {
  CATALOG_MAX_BYTES,
  CATALOG_MAX_ROWS,
  parseCatalogCsv,
} from "./catalog-csv";

const HEADER = "Categoría;Producto;Medida;Precio";

describe("parseCatalogCsv", () => {
  it("reads rows with an optional BOM and Windows line endings", () => {
    const parsed = parseCatalogCsv(
      `﻿${HEADER}\r\nCanastos;Canasto rectangular;40 × 20 × 10 alto;34600\r\n`,
    );
    expect(parsed).toEqual({
      ok: true,
      rows: [
        {
          line: 2,
          category: "Canastos",
          product: "Canasto rectangular",
          measure: "40 × 20 × 10 alto",
          price: 34600,
        },
      ],
      errors: [],
    });
  });

  it("treats an empty price as consultar precio", () => {
    const parsed = parseCatalogCsv(`${HEADER}\nPinturas;Acrílico;250 cc;\n`);
    expect(parsed.ok && parsed.rows[0]?.price).toBeNull();
    expect(parsed.ok && parsed.errors).toEqual([]);
  });

  it("keeps semicolons and doubled quotes inside quoted fields", () => {
    const parsed = parseCatalogCsv(
      `${HEADER}\nPinturas;"Acrílico; ""premium""";"1;5 l";12.500\n`,
    );
    expect(parsed.ok && parsed.rows[0]).toMatchObject({
      product: 'Acrílico; "premium"',
      measure: "1;5 l",
      price: 12500,
    });
  });

  it("skips blank lines but keeps real line numbers in errors", () => {
    const parsed = parseCatalogCsv(
      `${HEADER}\n\nPinturas;Acrílico;250 cc;abc\nPinturas;;1 l;100\nPinturas;Acrílico;;100\n`,
    );
    expect(parsed.ok && parsed.errors).toEqual([
      { line: 3, code: "invalid-price" },
      { line: 4, code: "missing-product" },
      { line: 5, code: "missing-measure" },
    ]);
  });

  it("rejects a zero price as invalid", () => {
    const parsed = parseCatalogCsv(`${HEADER}\nA;B;C;0\n`);
    expect(parsed.ok && parsed.errors).toEqual([
      { line: 2, code: "invalid-price" },
    ]);
  });

  it("flags a repeated product and measure with the later line", () => {
    const parsed = parseCatalogCsv(
      `${HEADER}\nA;Taza;Grande;100\na;TAZA;grande;200\n`,
    );
    expect(parsed.ok && parsed.errors).toEqual([
      { line: 3, code: "duplicate-row" },
    ]);
  });

  it("flags a row with too few columns", () => {
    const parsed = parseCatalogCsv(`${HEADER}\nA;B\n`);
    expect(parsed.ok && parsed.errors).toEqual([
      { line: 2, code: "wrong-columns" },
    ]);
  });

  it("refuses a file without the expected header", () => {
    expect(parseCatalogCsv("Producto;Precio\nA;1\n")).toEqual({
      ok: false,
      error: "bad-header",
    });
    expect(parseCatalogCsv("")).toEqual({ ok: false, error: "empty" });
  });

  it("refuses a file over the size or row limit", () => {
    expect(
      parseCatalogCsv(`${HEADER}\n${"x".repeat(CATALOG_MAX_BYTES)}`),
    ).toEqual({ ok: false, error: "too-large" });
    const rows = Array.from(
      { length: CATALOG_MAX_ROWS + 1 },
      (_, index) => `A;P${String(index)};M;1`,
    ).join("\n");
    expect(parseCatalogCsv(`${HEADER}\n${rows}`)).toEqual({
      ok: false,
      error: "too-many-rows",
    });
  });
});
