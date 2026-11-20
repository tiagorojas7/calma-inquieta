import type { MaterialStockRow } from "~/modules/materials";

const SEARCH_MAX = 80;
/** Catalog results shown at once, so a broad word never floods the page. */
const CATALOG_RESULTS = 12;

export function parseSearchText(value: string | null): string {
  return (value ?? "").trim().slice(0, SEARCH_MAX);
}

/** The element id of a studio card: what a post comes back to. */
export const materialAnchor = (id: string): string => `material-${id}`;

/** The element id of a catalog result, apart from the same material's studio card. */
export const catalogAnchor = (id: string): string => `catalogo-${id}`;

export type StockState = "hay" | "sin";

export interface StockVariantView {
  readonly id: string;
  readonly label: string;
  readonly state: StockState;
  readonly onHand: number;
}

export interface StockCardView {
  readonly id: string;
  readonly anchor: string;
  readonly name: string;
  readonly price: string;
  readonly state: StockState;
  readonly onHand: number;
  /** The one variant of a plain material, so the card itself takes "Llegaron". */
  readonly variantId?: string | undefined;
  /** One line per variant when there are several; empty for a plain material. */
  readonly variants: readonly StockVariantView[];
}

const stateOf = (onHand: number): StockState => (onHand > 0 ? "hay" : "sin");

const pesos = (amount: number): string =>
  `$ ${String(amount).replace(/\B(?=(\d{3})+$)/g, ".")}`;

function priceOf(row: MaterialStockRow): string {
  const prices = row.variants.flatMap((variant) =>
    variant.price === null ? [] : [variant.price],
  );
  if (prices.length === 0) return "Precio a consultar";
  const lowest = Math.min(...prices);
  return row.variants.length > 1 ? `Desde ${pesos(lowest)}` : pesos(lowest);
}

const plain = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");

/** The cards of "En el estudio": only the materials the studio keeps, each with its state in words. */
export function studioCards(
  rows: readonly MaterialStockRow[],
): StockCardView[] {
  return rows
    .filter((row) => row.keptInStudio)
    .map((row) => {
      const [only] = row.variants;
      const single = row.variants.length === 1 && only !== undefined;
      return {
        id: row.id,
        anchor: materialAnchor(row.id),
        name: row.name,
        price: priceOf(row),
        state: stateOf(row.onHand),
        onHand: row.onHand,
        ...(single ? { variantId: only.id } : {}),
        variants: single
          ? []
          : row.variants.map((variant) => ({
              id: variant.id,
              label: variant.label,
              state: stateOf(variant.onHand),
              onHand: variant.onHand,
            })),
      };
    });
}

/** One simple row of the catalog search. */
export interface CatalogRowView {
  readonly id: string;
  readonly anchor: string;
  readonly name: string;
  /** "Lo tenemos en el estudio". */
  readonly kept: boolean;
}

/**
 * The catalog behind a search: nothing until the owner types, then the
 * materials whose name, category or supplier match (a few at once, with how
 * many matched in all).
 */
export function catalogSearch(
  rows: readonly MaterialStockRow[],
  query: string,
): { rows: CatalogRowView[]; found: number } {
  const needle = plain(query.trim());
  if (needle === "") return { rows: [], found: 0 };
  const matching = rows.filter((row) =>
    plain(`${row.name} ${row.category} ${row.supplierName}`).includes(needle),
  );
  return {
    rows: matching.slice(0, CATALOG_RESULTS).map((row) => ({
      id: row.id,
      anchor: catalogAnchor(row.id),
      name: row.name,
      kept: row.keptInStudio,
    })),
    found: matching.length,
  };
}
