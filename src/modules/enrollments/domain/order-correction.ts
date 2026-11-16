import { err, ok, type Money, type Result } from "~/modules/_shared";
import {
  cancelOutcome,
  priceOrder,
  type InvalidRefund,
  type OrderStatus,
  type RefundField,
  type RefundIssueCode,
} from "./order-core";

/**
 * What a correction does to the order:
 * - `kept-pending`: a pending order takes the new values and stays pending.
 * - `kept-paid`: a paid order whose total did not change stays paid.
 * - `returned-to-pending`: a paid order whose total rose must be paid again.
 * - `lowered`: a paid order whose total dropped stays paid and records the
 *   difference the owner gave back.
 */
export type CorrectionOutcome =
  "kept-pending" | "kept-paid" | "returned-to-pending" | "lowered";

/** What the correction does to the turno seats the order holds. */
export type CorrectionSeatPlan =
  /** No seat changes hands. */
  | "none"
  /** The order stops holding its seat (it goes back to pending). */
  | "release"
  /** The old seat is released and the new one claimed. */
  | "move";

export type CorrectionRefusal =
  | InvalidRefund
  | { readonly kind: "invalid-fee" }
  | { readonly kind: "invalid-total" }
  | { readonly kind: "not-correctable" };

export interface CorrectionPlan {
  readonly outcome: CorrectionOutcome;
  readonly status: OrderStatus;
  /** The new fee plus the materials the order already carries. */
  readonly total: Money;
  readonly seat: CorrectionSeatPlan;
  /** Only for a lowered paid order: what was given back. */
  readonly refund?: { readonly amount: Money; readonly on: string };
}

const refused = (
  field: RefundField,
  code: RefundIssueCode,
): Result<never, InvalidRefund> => err({ kind: "invalid-refund", field, code });

/**
 * The single rule for correcting an active order (workshop, month, turno or
 * fee). Orders are never repriced silently: a higher total sends a paid order
 * back to pending, a lower one keeps it paid and needs the refunded
 * difference ($0 up to old total minus new total, dated from the payment day
 * to today, both Córdoba `YYYY-MM-DD`).
 */
export function planCorrection(
  order: {
    readonly status: OrderStatus;
    readonly materialsTotal: Money;
    readonly total: Money;
    readonly paidAmount?: Money;
    readonly paidOn?: string;
  },
  change: {
    readonly fee: Money;
    /** The month or the turno changes, so the seat has to move. */
    readonly moved: boolean;
    readonly refund?: { readonly amount: Money; readonly on: string };
  },
  today: string,
): Result<CorrectionPlan, CorrectionRefusal> {
  if (order.status === "cancelled") return err({ kind: "not-correctable" });
  const priced = priceOrder(change.fee, order.materialsTotal, {
    allowZeroFee: true,
  });
  if (!priced.ok)
    return err({
      kind: priced.error === "invalid-total" ? "invalid-total" : "invalid-fee",
    });
  const total = priced.value;
  const { refund } = change;

  if (cancelOutcome(order.status) !== "cancel-release") {
    if (refund !== undefined) return refused("amount", "not-refundable");
    return ok({
      outcome: "kept-pending",
      status: order.status,
      total,
      seat: "none",
    });
  }

  const direction = total.compare(order.total);
  if (direction > 0) {
    if (refund !== undefined) return refused("amount", "not-refundable");
    return ok({
      outcome: "returned-to-pending",
      status: "pending_confirmation",
      total,
      seat: "release",
    });
  }
  const seat: CorrectionSeatPlan = change.moved ? "move" : "none";
  if (direction === 0) {
    if (refund !== undefined) return refused("amount", "not-refundable");
    return ok({ outcome: "kept-paid", status: order.status, total, seat });
  }

  if (refund === undefined) return refused("amount", "required");
  if (refund.amount.isNegative()) return refused("amount", "negative");
  if (refund.amount.toCentavos() % 100 !== 0)
    return refused("amount", "not-whole-pesos");
  if (refund.amount.compare(order.total.subtract(total)) > 0)
    return refused("amount", "above-difference");
  if (refund.on > today) return refused("refundedOn", "future-date");
  if (order.paidOn !== undefined && refund.on < order.paidOn)
    return refused("refundedOn", "before-payment");
  return ok({ outcome: "lowered", status: order.status, total, seat, refund });
}
