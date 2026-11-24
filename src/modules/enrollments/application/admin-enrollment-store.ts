import { err, type Money, type Result } from "~/modules/_shared";
import type {
  CorrectionOutcome,
  CorrectionRefusal,
} from "../domain/order-correction";
import type {
  IllegalTransition,
  LineSource,
  OrderKind,
  OrderStatus,
  TurnoFull,
} from "../domain/order-core";
import type { PeriodClosed, PeriodStatus } from "../domain/period-window";
import type {
  AuditEntry,
  DuplicateOrder,
  OrderLineDraft,
  OrderRepositoryListQuery,
  StoredOrder,
} from "./enrollment-repository";

/** The monthly record cannot take a material sale: it is cancelled or is itself a sale. */
export type NotSellable = { readonly kind: "not-sellable" };

export type AdminEnrollmentStoreError =
  | { readonly kind: "not-found" }
  | NotSellable
  | { readonly kind: "unavailable" }
  | { readonly kind: "amount-mismatch" }
  | PeriodClosed
  | TurnoFull
  | IllegalTransition
  | DuplicateOrder
  | CorrectionRefusal;

export type AdminEnrollmentActor = { readonly email: string };
export type Confirmed =
  { readonly kind: "confirmed" } | { readonly kind: "already-confirmed" };
/** The shared read state: first opened by an owner now, or already read. */
export type SeenMark =
  { readonly kind: "seen" } | { readonly kind: "already-seen" };
export type Cancelled =
  { readonly kind: "cancelled" } | { readonly kind: "already-cancelled" };
export type Corrected = {
  readonly kind: "corrected";
  readonly outcome: CorrectionOutcome;
};
export type AdminListQuery = OrderRepositoryListQuery;
export type AdminListItem = Pick<
  StoredOrder,
  | "id"
  | "number"
  | "workshopName"
  | "period"
  | "turnoLabel"
  | "status"
  | "total"
> & {
  readonly studentName: string;
  readonly phoneDigits: string;
  readonly requestedOn: string;
  /** `material_sale` for a later material purchase; absent means the monthly record. */
  readonly kind?: OrderKind;
};

/** A material sale as its monthly record lists it. */
export interface MaterialSaleSummary {
  readonly id: string;
  readonly number: string;
  readonly status: OrderStatus;
  readonly total: Money;
  readonly requestedAt: Date;
}
export type AdminEnrollmentDetail = StoredOrder & {
  readonly email: string;
  readonly phoneDigits: string;
  readonly seat: { readonly confirmed: number; readonly capacity: number };
  readonly audit: readonly AuditEntry[];
  /** Every correction of the order, oldest first. */
  readonly corrections: readonly OrderCorrection[];
  /** `material_sale` for a sale; `enrollment` for a monthly record. */
  readonly kind?: OrderKind;
  /** The monthly record a sale belongs to. */
  readonly parent?: { readonly id: string; readonly number: string };
  /** The material sales under a monthly record, oldest first. */
  readonly sales?: readonly MaterialSaleSummary[];
};

/** Where an order sits: the workshop, month and turno of one record. */
export interface CorrectionTarget {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly periodId: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoId: string;
  readonly turnoLabel: string;
  readonly weekday: number;
  readonly startsAt: string;
  readonly endsAt: string;
}

/** An order as it stood before or after a correction. */
export interface CorrectionSnapshot extends CorrectionTarget {
  readonly fee: Money;
  readonly total: Money;
  readonly status: OrderStatus;
}

/** The audit record of one correction; corrections are never edited or removed. */
export interface OrderCorrection {
  readonly id: string;
  readonly at: Date;
  readonly actor: string;
  readonly note: string | null;
  readonly before: CorrectionSnapshot;
  readonly after: CorrectionSnapshot;
  /** The payment a raised total sent back to pending; it stays as history. */
  readonly previousPayment: {
    readonly amount: Money;
    readonly paidAt: Date;
    readonly confirmedBy: string | null;
  } | null;
  /** What the owner gave back when the total dropped. */
  readonly refund: {
    readonly amount: Money;
    /** The Córdoba day of the refund, stored at its local midnight. */
    readonly refundedAt: Date;
    readonly note: string | null;
  } | null;
}

/** The snapshot of an order as stored, for the correction record. */
export function snapshotOf(order: StoredOrder): CorrectionSnapshot {
  return {
    workshopId: order.workshopId,
    workshopName: order.workshopName,
    periodId: order.periodId,
    period: order.period,
    turnoId: order.turnoId,
    turnoLabel: order.turnoLabel,
    weekday: order.weekday,
    startsAt: order.startsAt,
    endsAt: order.endsAt,
    fee: order.fee,
    total: order.total,
    status: order.status,
  };
}

/** One supplier line that counts toward what the owner must buy for a month; stock lines never do. */
export interface ConsolidationLine {
  readonly orderId: string;
  readonly status: "paid" | "materials_requested";
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
  readonly unitPrice: Money;
}

/** One paid order with materials: still to request, requested from the supplier, or already handed to the student. */
export interface DeliveryOrder {
  readonly id: string;
  readonly number: string;
  /** `material_sale` for a later material purchase; absent means the monthly record. */
  readonly kind?: OrderKind;
  readonly status: "paid" | "materials_requested" | "materials_received";
  readonly studentName: string;
  readonly phoneDigits: string;
  readonly workshopName: string;
  readonly turnoLabel: string;
  readonly lines: readonly {
    readonly materialName: string;
    readonly variantLabel: string;
    readonly quantity: number;
    /** The supplier name snapshotted on the order line. */
    readonly supplierName: string;
    readonly unitPrice: Money;
    /** `stock` lines come from the studio's own stock; absent means `supplier`, a line that is ordered. */
    readonly source?: LineSource;
  }[];
}

/** Transaction boundary for all admin mutations; E4/E5 map it to one Drizzle transaction. */
export interface AdminEnrollmentStore {
  confirm(input: {
    readonly orderId: string;
    readonly amount: Money;
    readonly paidAt: Date;
    readonly note?: string;
    readonly actor: AdminEnrollmentActor;
    readonly now: Date;
  }): Promise<Result<Confirmed, AdminEnrollmentStoreError>>;
  /**
   * Cancels the order. A paid one (any paid state) releases its seat and must
   * carry the refund (from $0 up to what was paid, dated from the payment day
   * to today); a pending one carries none. Either way history stays.
   */
  cancel(input: {
    readonly orderId: string;
    readonly reason: string;
    readonly refund?: {
      readonly amount: Money;
      /** Córdoba `YYYY-MM-DD`. */
      readonly refundedOn: string;
      readonly note?: string;
    };
    readonly actor: AdminEnrollmentActor;
    readonly now: Date;
  }): Promise<Result<Cancelled, AdminEnrollmentStoreError>>;
  /**
   * Corrects an active order (workshop, month, turno and fee; the materials
   * stay). A paid order whose total is unchanged stays paid; a higher total
   * returns it to pending (the seat is released and the previous payment is
   * kept in the record); a lower one keeps it paid and records the refunded
   * difference. A paid order that changes month or turno releases its old seat
   * and claims the new one in the same transaction; a full target refuses
   * everything. Every correction appends an immutable record.
   */
  correct(input: {
    readonly orderId: string;
    /** Absent keeps the current workshop, month and turno. */
    readonly target?: CorrectionTarget;
    /** The new fee in whole pesos; $0 is allowed. */
    readonly fee: Money;
    /** Required exactly when a paid order's total drops. */
    readonly refund?: {
      readonly amount: Money;
      /** Córdoba `YYYY-MM-DD`. */
      readonly refundedOn: string;
      readonly note?: string;
    };
    readonly note?: string;
    readonly actor: AdminEnrollmentActor;
    readonly now: Date;
  }): Promise<Result<Corrected, AdminEnrollmentStoreError>>;
  /**
   * Marks an order read for both owners: the first call stamps who and when,
   * later calls change nothing and never overwrite the first mark. An order an
   * admin created is stored already read. It touches no status, payment,
   * audit row, seat or stock.
   */
  markSeen(input: {
    readonly orderId: string;
    readonly actor: AdminEnrollmentActor;
    readonly now: Date;
  }): Promise<Result<SeenMark, AdminEnrollmentStoreError>>;
  /**
   * Moves a paid order along the material steps. An order whose lines all come
   * from stock may go from `paid` straight to `materials_received`.
   */
  markMaterials(input: {
    readonly orderId: string;
    readonly to: "materials_requested" | "materials_received";
    readonly actor: AdminEnrollmentActor;
    readonly now: Date;
  }): Promise<Result<void, AdminEnrollmentStoreError>>;
  list(query: AdminListQuery): Promise<{
    readonly items: readonly AdminListItem[];
    readonly page: number;
    readonly pageSize: 50;
  }>;
  detail(
    orderId: string,
  ): Promise<Result<AdminEnrollmentDetail, AdminEnrollmentStoreError>>;
  /**
   * The `supplier` lines of `paid` and `materials_requested` orders whose
   * stored period is `period` (lines served from stock are never ordered),
   * plus how many orders still await confirmation. Never carries student data.
   */
  consolidationLines(period: string): Promise<{
    readonly lines: readonly ConsolidationLine[];
    readonly pendingOrders: number;
  }>;
  /**
   * Orders of `period` that are requested or received and carry at least
   * one material line, one entry per order, sorted by student name then number.
   */
  deliveryOrders(period: string): Promise<readonly DeliveryOrder[]>;
}

/** A material sale to create under a monthly record, lines already resolved from the catalog. */
export interface CreateSaleInput {
  /** The monthly record the sale belongs to. */
  readonly parentOrderId: string;
  readonly publicId: string;
  /** Córdoba year of `now`; selects the number sequence. */
  readonly year: number;
  /** The sum of the lines, in whole pesos; it is the sale total (a sale has no fee). */
  readonly materialsTotal: Money;
  readonly lines: readonly OrderLineDraft[];
  readonly actor: AdminEnrollmentActor;
  readonly now: Date;
}

/**
 * Creates the sale as a pending order that copies the student, workshop, month
 * and turno of its monthly record, never claiming a seat. The monthly record
 * is locked while the sale is stored and is never changed by it.
 */
export interface MaterialSaleStore {
  createSale(
    input: CreateSaleInput,
  ): Promise<
    Result<
      { readonly id: string; readonly number: string },
      AdminEnrollmentStoreError
    >
  >;
}

export type AdminEnrollmentPeriodLookup = {
  find(
    periodId: string,
    turnoId: string,
  ): Promise<{
    readonly status: PeriodStatus;
    readonly capacity: number;
  } | null>;
};

export const unavailable = <T>(): Result<T, AdminEnrollmentStoreError> =>
  err({ kind: "unavailable" });
