import { parseWholePesos } from "~/modules/_shared";
import { materialNameKey, variantLabelKey } from "./material-core";

export const CATALOG_MAX_BYTES = 1_000_000;
export const CATALOG_MAX_ROWS = 2000;

export type CatalogRowCode =
  | "wrong-columns"
  | "missing-category"
  | "missing-product"
  | "missing-measure"
  | "invalid-price"
  | "duplicate-row";

export interface CatalogRow {
  readonly line: number;
  readonly category: string;
  readonly product: string;
  readonly measure: string;
  /** Whole pesos; null means "consultar precio". */
  readonly price: number | null;
}

export interface CatalogRowIssue {
  readonly line: number;
  readonly code: CatalogRowCode;
}

export type CatalogFileError =
  "empty" | "bad-header" | "too-large" | "too-many-rows";

export type CatalogParse =
  | {
      readonly ok: true;
      readonly rows: readonly CatalogRow[];
      readonly errors: readonly CatalogRowIssue[];
    }
  | { readonly ok: false; readonly error: CatalogFileError };

const HEADER = ["categoria", "producto", "medida", "precio"];
const DELIMITER = ";";

const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

/** One logical record per entry, with the 1-based line each starts on. */
function splitRecords(
  text: string,
): readonly { readonly line: number; readonly fields: string[] }[] {
  const records: { line: number; fields: string[] }[] = [];
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let startLine = 1;
  let touched = false;

  const endRecord = () => {
    fields.push(field);
    if (touched || fields.length > 1 || fields[0]?.trim() !== "")
      records.push({ line: startLine, fields });
    fields = [];
    field = "";
    touched = false;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (text.charAt(index + 1) === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else {
        if (char === "\n") line += 1;
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
      touched = true;
    } else if (char === DELIMITER) {
      fields.push(field);
      field = "";
    } else if (char === "\r") {
      continue;
    } else if (char === "\n") {
      endRecord();
      line += 1;
      startLine = line;
    } else field += char;
  }
  endRecord();
  return records;
}

/** Parses the supplier catalog CSV; row problems are values, never throws. */
export function parseCatalogCsv(input: string): CatalogParse {
  const text = input.replace(/^\uFEFF/, "");
  if (new TextEncoder().encode(text).length > CATALOG_MAX_BYTES)
    return { ok: false, error: "too-large" };
  if (text.trim() === "") return { ok: false, error: "empty" };

  const [header, ...records] = splitRecords(text);
  if (
    !header ||
    header.fields.length < HEADER.length ||
    HEADER.some((name, index) => fold(header.fields[index] ?? "") !== name)
  )
    return { ok: false, error: "bad-header" };
  if (records.length > CATALOG_MAX_ROWS)
    return { ok: false, error: "too-many-rows" };

  const rows: CatalogRow[] = [];
  const errors: CatalogRowIssue[] = [];
  const seen = new Set<string>();
  for (const { line, fields } of records) {
    if (fields.length !== HEADER.length) {
      errors.push({ line, code: "wrong-columns" });
      continue;
    }
    const [category = "", product = "", measure = "", price = ""] = fields.map(
      (value) => value.normalize("NFC").trim(),
    );
    if (!category) errors.push({ line, code: "missing-category" });
    else if (!product) errors.push({ line, code: "missing-product" });
    else if (!measure) errors.push({ line, code: "missing-measure" });
    else {
      let pesos: number | null = null;
      if (price !== "") {
        const parsed = parseWholePesos(price);
        if (!parsed.ok || parsed.value.isZero()) {
          errors.push({ line, code: "invalid-price" });
          continue;
        }
        pesos = parsed.value.toCentavos() / 100;
      }
      const key = `${materialNameKey(product)}\u0000${variantLabelKey(measure)}`;
      if (seen.has(key)) {
        errors.push({ line, code: "duplicate-row" });
        continue;
      }
      seen.add(key);
      rows.push({ line, category, product, measure, price: pesos });
    }
  }
  return { ok: true, rows, errors };
}
