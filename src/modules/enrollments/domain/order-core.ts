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
  materials_requested: ["materials_received"],
  materials_received: [],
  cancelled: [],
};

export function transition(
  from: OrderStatus,
  to: OrderStatus,
  context: { readonly hasMaterialLines: boolean },
): Result<OrderStatus, IllegalTransition> {
  const allowed =
    ALLOWED[from].includes(to) &&
    (to !== "materials_requested" || context.hasMaterialLines);
  return allowed ? ok(to) : err({ kind: "illegal-transition", from, to });
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

export type CancelOutcome =
  "cancel" | "cancel-release" | "already-cancelled" | "illegal";

export function cancelOutcome(status: OrderStatus): CancelOutcome {
  switch (status) {
    case "pending_confirmation":
      return "cancel";
    case "paid":
      return "cancel-release";
    case "cancelled":
      return "already-cancelled";
    case "materials_requested":
    case "materials_received":
      return "illegal";
  }
}

/** A seat goes back only when a paid order is cancelled. */
export function releasesSeat(from: OrderStatus, to: OrderStatus): boolean {
  return from === "paid" && to === "cancelled";
}

// Order identity ------------------------------------------------------------

const CORDOBA_OFFSET_MS = 3 * 60 * 60 * 1000;

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

/** Total = fee + materials; both whole pesos, fee positive, materials >= 0. */
export function priceOrder(
  fee: Money,
  materials: Money,
): Result<Money, OrderPriceError> {
  if (
    fee.toCentavos() <= 0 ||
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
