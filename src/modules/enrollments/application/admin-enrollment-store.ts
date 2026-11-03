import { err, type Money, type Result } from "~/modules/_shared";
import type { IllegalTransition, TurnoFull } from "../domain/order-core";
import type { PeriodClosed, PeriodStatus } from "../domain/period-window";
import type {
  AuditEntry,
  OrderRepositoryListQuery,
  StoredOrder,
} from "./enrollment-repository";

export type AdminEnrollmentStoreError =
  | { readonly kind: "not-found" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "amount-mismatch" }
  | PeriodClosed
  | TurnoFull
  | IllegalTransition;

export type AdminEnrollmentActor = { readonly email: string };
export type Confirmed =
  { readonly kind: "confirmed" } | { readonly kind: "already-confirmed" };
export type Cancelled =
  { readonly kind: "cancelled" } | { readonly kind: "already-cancelled" };
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
};
export type AdminEnrollmentDetail = StoredOrder & {
  readonly email: string;
  readonly phoneDigits: string;
  readonly seat: { readonly confirmed: number; readonly capacity: number };
  readonly audit: readonly AuditEntry[];
};

/** One order line that counts toward what the owner must buy for a month. */
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
  cancel(input: {
    readonly orderId: string;
    readonly reason: string;
    readonly actor: AdminEnrollmentActor;
    readonly now: Date;
  }): Promise<Result<Cancelled, AdminEnrollmentStoreError>>;
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
   * Lines of `paid` and `materials_requested` orders whose stored period is
   * `period`, plus how many orders still await confirmation. Never carries
   * student data.
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
