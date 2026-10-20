import { err, ok, Money, type Result } from "~/modules/_shared";
import { priceOrder } from "./order-core";

export const MIN_LINE_QUANTITY = 1;
export const MAX_LINE_QUANTITY = 20;
export const MAX_CART_LINES = 30;

export interface CartLine {
  readonly materialId: string;
  readonly variantId: string;
  readonly quantity: number;
}

export type CartError =
  | { readonly kind: "invalid-quantity"; readonly variantId: string }
  | { readonly kind: "too-many-lines" };

const isValidQuantity = (quantity: number): boolean =>
  Number.isInteger(quantity) &&
  quantity >= MIN_LINE_QUANTITY &&
  quantity <= MAX_LINE_QUANTITY;

/** Adds a line, merging into the line of the same variant. Never mutates. */
export function addToCart(
  cart: readonly CartLine[],
  line: CartLine,
): Result<readonly CartLine[], CartError> {
  if (!isValidQuantity(line.quantity)) {
    return err({ kind: "invalid-quantity", variantId: line.variantId });
  }
  const existing = cart.find((l) => l.variantId === line.variantId);
  if (existing === undefined) {
    return cart.length >= MAX_CART_LINES
      ? err({ kind: "too-many-lines" })
      : ok([...cart, line]);
  }
  const merged = existing.quantity + line.quantity;
  if (!isValidQuantity(merged)) {
    return err({ kind: "invalid-quantity", variantId: line.variantId });
  }
  return ok(cart.map((l) => (l === existing ? { ...l, quantity: merged } : l)));
}

/** Builds a cart from a submitted payload: the same rules, line by line. */
export function buildCart(
  payload: readonly CartLine[],
): Result<readonly CartLine[], CartError> {
  let cart: readonly CartLine[] = [];
  for (const line of payload) {
    const next = addToCart(cart, line);
    if (!next.ok) return next;
    cart = next.value;
  }
  return ok(cart);
}

// Pricing -------------------------------------------------------------------

export interface PricingLineInput extends CartLine {
  readonly unitPrice: Money;
}

export interface PricedLine extends PricingLineInput {
  readonly lineTotal: Money;
}

export interface PricedCart {
  readonly lines: readonly PricedLine[];
  readonly materialsTotal: Money;
  readonly total: Money;
}

export type PricingError =
  | { readonly kind: "materials-required" }
  | { readonly kind: "invalid-price"; readonly variantId: string }
  | { readonly kind: "invalid-fee" }
  | { readonly kind: "invalid-total" };

/**
 * Prices a validated cart: total = fee + sum(price x quantity), whole pesos.
 * Totals outside the safe-integer range are refused, never rounded.
 */
export function priceCart(input: {
  readonly fee: Money;
  readonly materialsRequired: boolean;
  readonly lines: readonly PricingLineInput[];
}): Result<PricedCart, PricingError> {
  if (input.materialsRequired && input.lines.length === 0) {
    return err({ kind: "materials-required" });
  }
  const invalid = input.lines.find(
    (l) => l.unitPrice.isNegative() || l.unitPrice.toCentavos() % 100 !== 0,
  );
  if (invalid !== undefined) {
    return err({ kind: "invalid-price", variantId: invalid.variantId });
  }
  try {
    const lines: PricedLine[] = input.lines.map((l) => ({
      ...l,
      lineTotal: l.unitPrice.multiply(l.quantity),
    }));
    const materialsTotal = lines.reduce(
      (sum, l) => sum.add(l.lineTotal),
      Money.zero(),
    );
    const total = priceOrder(input.fee, materialsTotal);
    if (!total.ok) {
      return err(
        total.error === "invalid-total"
          ? { kind: "invalid-total" }
          : { kind: "invalid-fee" },
      );
    }
    return ok({ lines, materialsTotal, total: total.value });
  } catch (error) {
    if (error instanceof RangeError) return err({ kind: "invalid-total" });
    throw error;
  }
}
