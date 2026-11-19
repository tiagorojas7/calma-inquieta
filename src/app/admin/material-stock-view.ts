import type { MaterialStockRow } from "~/modules/materials";

/** The stock filter of "Qué hay": everything, with units, or without. */
export type StockFilter = "todos" | "hay" | "sin";

const SEARCH_MAX = 80;

export function parseStockFilter(value: string | null): StockFilter {
  return value === "hay" || value === "sin" ? value : "todos";
}

export function parseSearchText(value: string | null): string {
  return (value ?? "").trim().slice(0, SEARCH_MAX);
}

/** The element id of a material card: what a post comes back to. */
export const materialAnchor = (id: string): string => `material-${id}`;

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

/**
 * The cards of "Qué hay": the rows that pass the stock filter and the search
 * (name, category or supplier), each with its state in words.
 */
export function stockCards(
  rows: readonly MaterialStockRow[],
  { filter, query }: { filter: StockFilter; query: string },
): StockCardView[] {
  const needle = plain(query.trim());
  return rows
    .filter((row) => filter === "todos" || stateOf(row.onHand) === filter)
    .filter(
      (row) =>
        needle === "" ||
        plain(`${row.name} ${row.category} ${row.supplierName}`).includes(
          needle,
        ),
    )
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
