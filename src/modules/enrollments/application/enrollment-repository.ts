import type { Money, NotFound, Result } from "~/modules/_shared";
import type { IllegalTransition, OrderStatus } from "../domain/order-core";
import type { StudentContact } from "../domain/student-input";

export interface OrderLineDraft {
  readonly materialId: string;
  readonly variantId: string;
  readonly materialName: string;
  readonly variantLabel: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly supplierId: string;
  readonly supplierName: string;
}

export interface OrderDraft {
  readonly publicId: string;
  /** Córdoba year of the request; selects the number sequence. */
  readonly year: number;
  readonly requestedAt: Date;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly periodId: string;
  readonly period: string;
  readonly turnoId: string;
  readonly turnoLabel: string;
  readonly weekday: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly student: StudentContact;
  readonly fee: Money;
  readonly materialsTotal: Money;
  readonly total: Money;
  readonly policyVersion: string;
  /** Position is the array index. */
  readonly lines: readonly OrderLineDraft[];
}

export interface StoredOrder extends Omit<OrderDraft, "year"> {
  readonly id: string;
  /** `CI-YYYY-NNNN`, assigned by the repository inside the create transaction. */
  readonly number: string;
  readonly status: OrderStatus;
  readonly paidAt?: Date;
  readonly paidAmount?: Money;
  readonly confirmedBy?: string;
  readonly paymentNote?: string;
}

export type DuplicateOrder = { readonly kind: "duplicate-order" };

/** Filters one fixed-size page of administrative order reads. */
export interface OrderRepositoryListQuery {
  readonly status?: OrderStatus;
  readonly period?: string;
  readonly workshopId?: string;
  readonly text?: string;
  readonly page?: number;
}

export interface AuditEntry {
  readonly at: Date;
  /** `public` for creation, the admin email otherwise. */
  readonly actor: string;
  readonly from: OrderStatus | null;
  readonly to: OrderStatus;
  readonly note: string | null;
}

export interface TransitionContext {
  readonly actor: string;
  readonly at: Date;
  readonly note?: string;
  readonly paidAt?: Date;
  readonly paidAmount?: Money;
}

/**
 * Order aggregate port. `create` is one transaction: duplicate check, number
 * from the yearly sequence, order, lines and the creation audit row; a failure
 * leaves nothing behind and the number is reused. The seat-effecting
 * transitions (confirm, cancel of a paid order) are added by slice E3.
 */
export interface OrderRepository {
  create(draft: OrderDraft): Promise<Result<StoredOrder, DuplicateOrder>>;
  /** The only public lookup key; an order number never matches. */
  findByPublicId(publicId: string): Promise<StoredOrder | null>;
  /** Admin-only lookup; implementations later lock this row with its transition. */
  findForAdmin(orderId: string): Promise<StoredOrder | null>;
  /** Returns at most 50 filtered orders from the selected newest-first page. */
  listForAdmin(
    query: OrderRepositoryListQuery,
  ): Promise<readonly StoredOrder[]>;
  /** Moves the status along the transitions table and appends one audit row. */
  transitionOrder(
    orderId: string,
    to: OrderStatus,
    context: TransitionContext,
  ): Promise<Result<StoredOrder, IllegalTransition | NotFound>>;
  auditTrail(orderId: string): Promise<readonly AuditEntry[]>;
}
