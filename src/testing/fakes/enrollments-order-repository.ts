import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import type {
  AuditEntry,
  DuplicateOrder,
  OrderDraft,
  OrderRepository,
  StoredOrder,
  TransitionContext,
} from "~/modules/enrollments/application/enrollment-repository";
import {
  formatOrderNumber,
  transition,
  type IllegalTransition,
  type OrderStatus,
} from "~/modules/enrollments/domain/order-core";

interface Row {
  order: StoredOrder;
  audit: AuditEntry[];
}

/**
 * In-memory order aggregate. Status moves go through the same `transition`
 * table as production code, so there is one rule.
 */
export class InMemoryOrderRepository implements OrderRepository {
  private readonly rows: Row[] = [];
  private readonly sequences = new Map<number, number>();
  private failNext = false;

  /** Simulates a crash after the number is assigned and before the insert. */
  failNextCreateAfterNumbering(): void {
    this.failNext = true;
  }

  size(): number {
    return this.rows.length;
  }

  create(draft: OrderDraft): Promise<Result<StoredOrder, DuplicateOrder>> {
    const active = this.rows.some(
      ({ order }) =>
        order.status !== "cancelled" &&
        order.student.email === draft.student.email &&
        order.workshopId === draft.workshopId &&
        order.periodId === draft.periodId,
    );
    if (active) return Promise.resolve(err({ kind: "duplicate-order" }));

    const sequence = (this.sequences.get(draft.year) ?? 0) + 1;
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error("injected failure after numbering"));
    }
    this.sequences.set(draft.year, sequence);

    const { year, ...fields } = draft;
    const order: StoredOrder = {
      ...fields,
      id: `order-${String(this.rows.length + 1)}`,
      number: formatOrderNumber(year, sequence),
      status: "pending_confirmation",
    };
    this.rows.push({
      order,
      audit: [
        {
          at: draft.requestedAt,
          actor: "public",
          from: null,
          to: "pending_confirmation",
          note: null,
        },
      ],
    });
    return Promise.resolve(ok(order));
  }

  findByPublicId(publicId: string): Promise<StoredOrder | null> {
    return Promise.resolve(
      this.rows.find(({ order }) => order.publicId === publicId)?.order ?? null,
    );
  }

  transitionOrder(
    orderId: string,
    to: OrderStatus,
    context: TransitionContext,
  ): Promise<Result<StoredOrder, IllegalTransition | NotFound>> {
    const row = this.rows.find(({ order }) => order.id === orderId);
    if (row === undefined) return Promise.resolve(err({ kind: "not-found" }));
    const moved = transition(row.order.status, to, {
      hasMaterialLines: row.order.lines.length > 0,
    });
    if (!moved.ok) return Promise.resolve(moved);
    row.audit.push({
      at: context.at,
      actor: context.actor,
      from: row.order.status,
      to,
      note: context.note ?? null,
    });
    row.order = { ...row.order, status: to };
    return Promise.resolve(ok(row.order));
  }

  auditTrail(orderId: string): Promise<readonly AuditEntry[]> {
    return Promise.resolve([
      ...(this.rows.find(({ order }) => order.id === orderId)?.audit ?? []),
    ]);
  }
}
