import { err, ok, type Money, type Result } from "~/modules/_shared";

export const ORDER_STATUSES = [
  "pending_confirmation",
  "paid",
  "materials_requested",
  "materials_received",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type IllegalTransition = {
  readonly kind: "illegal-transition";
  readonly from: OrderStatus;
  readonly to: OrderStatus;
};

/** The single source of truth for allowed moves (specs/orders). */
const ALLOWED: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_confirmation: ["paid", "cancelled"],
  paid: ["materials_requested", "cancelled"],
  materials_requested: ["materials_received", "cancelled"],
  materials_received: ["cancelled"],
  cancelled: [],
};

/**
 * What the order's lines say about its fulfillment. `hasSupplierLines` is
 * true unless the caller knows every line comes from the studio's own stock.
 */
export interface TransitionLines {
  readonly hasMaterialLines: boolean;
  readonly hasSupplierLines?: boolean;
}

export function transition(
  from: OrderStatus,
  to: OrderStatus,
  context: TransitionLines,
): Result<OrderStatus, IllegalTransition> {
  // An order whose lines all come from stock has nothing to request from a
  // supplier, so it may go from paid straight to received.
  const stockOnly =
    context.hasMaterialLines && context.hasSupplierLines === false;
  const allowed =
    (ALLOWED[from].includes(to) &&
      (to !== "materials_requested" || context.hasMaterialLines)) ||
    (from === "paid" && to === "materials_received" && stockOnly);
  return allowed ? ok(to) : err({ kind: "illegal-transition", from, to });
}

// Line source ---------------------------------------------------------------

export const LINE_SOURCES = ["stock", "supplier"] as const;
/** Where an order line's units come from: the studio's stock or the supplier. */
export type LineSource = (typeof LINE_SOURCES)[number];

/**
 * What an order's lines say about its fulfillment. A line without a source is
 * ordered from the supplier, like the column default. A stock-only order has
 * nothing to request from a supplier.
 */
export function fulfillmentOf(
  lines: readonly { readonly source?: LineSource }[],
): Required<TransitionLines> & { readonly stockOnly: boolean } {
  const hasSupplierLines = lines.some((line) => line.source !== "stock");
  return {
    hasMaterialLines: lines.length > 0,
    hasSupplierLines,
    stockOnly: lines.length > 0 && !hasSupplierLines,
  };
}

/** A line is served from stock only when the units on hand cover its quantity. */
export function lineSourceFor(onHand: number, quantity: number): LineSource {
  return onHand >= quantity ? "stock" : "supplier";
}

export type ConfirmOutcome = "claim" | "already-confirmed" | "illegal";

/** Confirming payment is idempotent once the order is paid or beyond. */
export function confirmOutcome(status: OrderStatus): ConfirmOutcome {
  switch (status) {
    case "pending_confirmation":
      return "claim";
    case "paid":
    case "materials_requested":
    case "materials_received":
      return "already-confirmed";
    case "cancelled":
      return "illegal";
  }
}

export type CancelOutcome = "cancel" | "cancel-release" | "already-cancelled";

/** Every state that holds a seat (the order was paid) releases it exactly once on cancel. */
export function cancelOutcome(status: OrderStatus): CancelOutcome {
  switch (status) {
    case "pending_confirmation":
      return "cancel";
    case "paid":
    case "materials_requested":
    case "materials_received":
      return "cancel-release";
    case "cancelled":
      return "already-cancelled";
  }
}

/** A seat goes back only when an order in a paid state is cancelled. */
export function releasesSeat(from: OrderStatus, to: OrderStatus): boolean {
  return cancelOutcome(from) === "cancel-release" && to === "cancelled";
}

// Refunds -------------------------------------------------------------------

export type RefundField = "amount" | "refundedOn" | "note";
export type RefundIssueCode =
  | "required"
  | "invalid-format"
  | "out-of-range"
  | "invalid-calendar-date"
  | "too-long"
  | "negative"
  | "not-whole-pesos"
  | "above-paid"
  | "above-difference"
  | "not-refundable"
  | "future-date"
  | "before-payment";
export type InvalidRefund = {
  readonly kind: "invalid-refund";
  readonly field: RefundField;
  readonly code: RefundIssueCode;
};

const invalidRefund = (
  field: RefundField,
  code: RefundIssueCode,
): Result<never, InvalidRefund> => err({ kind: "invalid-refund", field, code });

/**
 * What cancelling an order must record. A paid order (any paid state) records
 * the amount returned, from $0 up to what was paid, dated from the payment day
 * to today (both Córdoba `YYYY-MM-DD`); a pending order records none.
 */
export function checkRefund(
  order: {
    readonly status: OrderStatus;
    readonly paidAmount?: Money;
    readonly paidOn?: string;
  },
  refund: { readonly amount: Money; readonly on: string } | undefined,
  today: string,
): Result<undefined, InvalidRefund> {
  const paid = cancelOutcome(order.status) === "cancel-release";
  if (!paid)
    return refund === undefined
      ? ok(undefined)
      : invalidRefund("amount", "not-refundable");
  if (refund === undefined) return invalidRefund("amount", "required");
  if (refund.amount.isNegative()) return invalidRefund("amount", "negative");
  if (!isWholePesos(refund.amount))
    return invalidRefund("amount", "not-whole-pesos");
  if (
    order.paidAmount !== undefined &&
    refund.amount.compare(order.paidAmount) > 0
  )
    return invalidRefund("amount", "above-paid");
  if (refund.on > today) return invalidRefund("refundedOn", "future-date");
  if (order.paidOn !== undefined && refund.on < order.paidOn)
    return invalidRefund("refundedOn", "before-payment");
  return ok(undefined);
}

// Order identity ------------------------------------------------------------

const CORDOBA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** The Córdoba calendar date (`YYYY-MM-DD`) of an instant. */
export function cordobaDateOf(instant: Date): string {
  return new Date(instant.getTime() - CORDOBA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** The instant a Córdoba calendar date is stored at: its local midnight (03:00 UTC). */
export function cordobaDayStart(date: string): Date {
  return new Date(`${date}T03:00:00.000Z`);
}

/** Argentina has no DST, so Córdoba is a fixed UTC-03:00. */
export function cordobaYearOf(instant: Date): number {
  return new Date(instant.getTime() - CORDOBA_OFFSET_MS).getUTCFullYear();
}

export function formatOrderNumber(year: number, sequence: number): string {
  return `CI-${String(year)}-${String(sequence).padStart(4, "0")}`;
}

const PUBLIC_ID = /^[A-Za-z0-9_-]{22,}$/;
const BASE64URL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function isPublicId(value: string): boolean {
  return PUBLIC_ID.test(value);
}

/** Encodes caller-supplied random bytes (16 or more) as unpadded base64url. */
export function generatePublicId(bytes: Uint8Array): string {
  if (bytes.length < 16) {
    throw new RangeError("A public id needs at least 16 random bytes");
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk =
      ((bytes[i] ?? 0) << 16) |
      ((bytes[i + 1] ?? 0) << 8) |
      (bytes[i + 2] ?? 0);
    const chars = Math.min(bytes.length - i, 3) + 1;
    for (let c = 0; c < chars; c += 1) {
      out += BASE64URL.charAt((chunk >> (18 - 6 * c)) & 63);
    }
  }
  return out;
}

// Money ---------------------------------------------------------------------

export type OrderPriceError = "invalid-amount" | "invalid-total";

const isWholePesos = (money: Money): boolean => money.toCentavos() % 100 === 0;

/**
 * Total = fee + materials; both whole pesos, materials >= 0, fee positive. A
 * free enrollment (a scholarship set by an admin) opts in to a zero fee.
 */
export function priceOrder(
  fee: Money,
  materials: Money,
  options: { readonly allowZeroFee?: boolean } = {},
): Result<Money, OrderPriceError> {
  if (
    fee.toCentavos() < (options.allowZeroFee === true ? 0 : 1) ||
    materials.isNegative() ||
    !isWholePesos(fee) ||
    !isWholePesos(materials)
  ) {
    return err("invalid-amount");
  }
  try {
    return ok(fee.add(materials));
  } catch (error) {
    if (error instanceof RangeError) return err("invalid-total");
    throw error;
  }
}

export type AmountMismatch = { readonly kind: "amount-mismatch" };

/** A confirmation must pay exactly the order total (no partial payments in v1). */
export function checkPaymentAmount(
  total: Money,
  amount: Money,
): Result<Money, AmountMismatch> {
  return isWholePesos(amount) && amount.equals(total)
    ? ok(amount)
    : err({ kind: "amount-mismatch" });
}

// Seats ---------------------------------------------------------------------

export type TurnoFull = { readonly kind: "turno-full" };

/** The confirmed count after a claim, or `turno-full` (also when capacity was lowered). */
export function seatClaim(
  confirmed: number,
  capacity: number,
): Result<number, TurnoFull> {
  return confirmed < capacity ? ok(confirmed + 1) : err({ kind: "turno-full" });
}

/** Pending orders never reduce availability. */
export function availableSeats(capacity: number, confirmed: number): number {
  return Math.max(0, capacity - confirmed);
}
