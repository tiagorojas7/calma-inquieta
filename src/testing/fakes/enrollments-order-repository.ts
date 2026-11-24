import {
  err,
  ok,
  type Money,
  type NotFound,
  type Result,
} from "~/modules/_shared";
import {
  snapshotOf,
  unavailable,
  type AdminEnrollmentDetail,
  type AdminEnrollmentPeriodLookup,
  type AdminEnrollmentStore,
  type AdminEnrollmentStoreError,
  type AdminListQuery,
  type Cancelled,
  type Corrected,
  type CorrectionTarget,
  type ConsolidationLine,
  type DeliveryOrder,
  type Confirmed,
  type SeenMark,
  type OrderCorrection,
} from "~/modules/enrollments/application/admin-enrollment-store";
import type {
  AuditEntry,
  DuplicateOrder,
  OrderDraft,
  OrderRepository,
  OrderRepositoryListQuery,
  StoredOrder,
  TransitionContext,
} from "~/modules/enrollments/application/enrollment-repository";
import type {
  OrderStockPort,
  OrderStockStamp,
} from "~/modules/enrollments/application/order-stock";
import type { SeatLedger } from "~/modules/enrollments/application/seat-ledger";
import {
  checkPaymentAmount,
  checkRefund,
  confirmOutcome,
  cancelOutcome,
  fulfillmentOf,
  cordobaDateOf,
  cordobaDayStart,
  transition,
  type IllegalTransition,
  type OrderStatus,
  type TurnoFull,
} from "~/modules/enrollments/domain/order-core";
import { planCorrection } from "~/modules/enrollments/domain/order-correction";
import { periodAcceptsOrders } from "~/modules/enrollments/domain/period-window";
import { InMemorySeatLedger } from "./enrollments-seat-ledger";
import { InMemoryStudentActivityStore } from "./enrollments-student-activity-store";

interface Row {
  order: StoredOrder;
  audit: AuditEntry[];
  corrections: OrderCorrection[];
}

/** What a correction writes to the order row, decided by the store. */
export interface OrderCorrectionChange {
  readonly target?: CorrectionTarget;
  readonly fee: Money;
  readonly total: Money;
  readonly status: OrderStatus;
  /** `clear` drops the payment (back to pending); `repay` keeps it at the new total. */
  readonly payment: "keep" | "clear" | "repay";
  readonly audit?: AuditEntry;
  readonly correction: OrderCorrection;
}

/**
 * The extra capability the in-memory order repository gives its admin store so
 * a correction is one atomic write, as in the Drizzle transaction. Test-only:
 * the production `OrderRepository` port does not have it.
 */
export interface CorrectableOrders {
  /** True when the order's student already holds an active order in `period`. */
  holdsMonth(orderId: string, period: string): boolean;
  applyCorrection(
    orderId: string,
    change: OrderCorrectionChange,
  ): Result<StoredOrder, DuplicateOrder | NotFound>;
  corrections(orderId: string): Promise<readonly OrderCorrection[]>;
}

/**
 * The stock movements the in-memory repository applies to the lines of a
 * stored order, as the Drizzle transaction does. Test-only: the production
 * `OrderRepository` port does not have them.
 */
export interface StockedOrders {
  /** Takes every `stock` line not yet taken, once; a line that cannot be covered becomes a `supplier` line. */
  takeStockLines(orderId: string, stamp: OrderStockStamp): Promise<void>;
  /** Puts back the units of every line that took them, and clears their mark. */
  returnStockLines(orderId: string, stamp: OrderStockStamp): Promise<void>;
}

/** The read state of the orders, which the fake store needs to mark one seen. */
export interface SeenOrders {
  markSeen(orderId: string, by: string, at: Date): boolean | undefined;
}

const isSeenable = (
  orders: OrderRepository,
): orders is OrderRepository & SeenOrders =>
  "markSeen" in orders && typeof orders.markSeen === "function";

const isStocked = (
  orders: OrderRepository,
): orders is OrderRepository & StockedOrders =>
  "takeStockLines" in orders &&
  typeof orders.takeStockLines === "function" &&
  "returnStockLines" in orders;

const PAYMENT_KEYS = new Set([
  "paidAt",
  "paidAmount",
  "confirmedBy",
  "paymentNote",
]);

/** The order as if it had never been paid: the payment fields are dropped. */
const withoutPayment = (order: StoredOrder): StoredOrder =>
  Object.fromEntries(
    Object.entries(order).filter(([key]) => !PAYMENT_KEYS.has(key)),
  ) as unknown as StoredOrder;

const isCorrectable = (
  orders: OrderRepository,
): orders is OrderRepository & CorrectableOrders =>
  "applyCorrection" in orders &&
  typeof orders.applyCorrection === "function" &&
  "holdsMonth" in orders &&
  "corrections" in orders;

const cordobaDate = (instant: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  if (!year || !month || !day)
    throw new Error("Córdoba date parts unavailable");
  return `${year}-${month}-${day}`;
};

/** In-memory order aggregate driven by the same transition table as production. */
export class InMemoryOrderRepository
  implements OrderRepository, CorrectableOrders, SeenOrders
{
  private readonly rows: Row[] = [];
  /** Durable profiles keyed like production: unique email and unique phone. */
  private readonly students: {
    id: string;
    email: string;
    phoneDigits: string;
  }[] = [];
  private readonly studentOf = new Map<string, string>();
  /** The shared read state per order id: null while nobody opened it. */
  private readonly seen = new Map<
    string,
    { readonly by: string; readonly at: Date } | null
  >();
  private readonly sequences = new Map<number, number>();
  private failNext = false;
  private reads = 0;
  private readonly seats: SeatLedger;
  /** Every enrollment, public or manual, leaves its profile active, like the transaction. */
  private readonly activity: InMemoryStudentActivityStore;
  private readonly stock: OrderStockPort<unknown> | undefined;
  /** The `stock` lines whose units were taken, as `orderId:position`. */
  private readonly taken = new Set<string>();
  /**
   * A free order created paid claims its seat from the same ledger the services
   * read, and takes its stock lines from `stock` when one is given.
   */
  constructor(
    seats: SeatLedger = new InMemorySeatLedger(),
    activity: InMemoryStudentActivityStore = new InMemoryStudentActivityStore(),
    stock?: OrderStockPort<unknown>,
  ) {
    this.seats = seats;
    this.activity = activity;
    this.stock = stock;
  }
  async takeStockLines(orderId: string, stamp: OrderStockStamp): Promise<void> {
    const row = this.rows.find(({ order }) => order.id === orderId);
    if (!row || !this.stock) return;
    const lines = [...row.order.lines];
    const byVariant = lines
      .map((line, position) => ({ line, position }))
      .filter(({ line }) => line.source === "stock")
      .sort((a, b) => (a.line.variantId < b.line.variantId ? -1 : 1));
    for (const { line, position } of byVariant) {
      const mark = `${orderId}:${String(position)}`;
      if (this.taken.has(mark)) continue;
      const taken = await this.stock.take(
        undefined,
        line.variantId,
        line.quantity,
        stamp,
      );
      if (taken) this.taken.add(mark);
      else lines[position] = { ...line, source: "supplier" };
    }
    row.order = { ...row.order, lines };
  }
  async returnStockLines(
    orderId: string,
    stamp: OrderStockStamp,
  ): Promise<void> {
    const row = this.rows.find(({ order }) => order.id === orderId);
    if (!row || !this.stock) return;
    for (const [position, line] of row.order.lines.entries()) {
      const mark = `${orderId}:${String(position)}`;
      if (line.source !== "stock" || !this.taken.has(mark)) continue;
      await this.stock.put(undefined, line.variantId, line.quantity, stamp);
      this.taken.delete(mark);
    }
  }
  failNextCreateAfterNumbering(): void {
    this.failNext = true;
  }
  size(): number {
    return this.rows.length;
  }
  readCount(): number {
    return this.reads;
  }
  /**
   * The seat is claimed first and released again when the rest of the creation
   * fails, so a refused or failed order leaves no trace, like the transaction.
   */
  async create(
    draft: OrderDraft,
  ): Promise<Result<StoredOrder, DuplicateOrder | TurnoFull>> {
    const { paidOnCreation } = draft;
    if (paidOnCreation) {
      const claimed = await this.seats.claim(
        draft.periodId,
        draft.turnoId,
        paidOnCreation.capacity,
      );
      if (!claimed.ok) return claimed;
    }
    let stored: Result<StoredOrder, DuplicateOrder>;
    try {
      stored = this.insert(draft);
    } catch (error) {
      if (paidOnCreation)
        await this.seats.release(draft.periodId, draft.turnoId);
      throw error;
    }
    if (!stored.ok && paidOnCreation)
      await this.seats.release(draft.periodId, draft.turnoId);
    if (stored.ok && paidOnCreation) {
      await this.takeStockLines(stored.value.id, {
        by: paidOnCreation.confirmedBy,
        at: paidOnCreation.paidAt,
      });
      return ok(
        this.rows.find(({ order }) => order.id === stored.value.id)?.order ??
          stored.value,
      );
    }
    return stored;
  }
  private insert(draft: OrderDraft): Result<StoredOrder, DuplicateOrder> {
    const byEmail = this.students.find((s) => s.email === draft.student.email);
    const byPhone = this.students.find(
      (s) => s.phoneDigits === draft.student.phoneDigits,
    );
    if (byEmail && byPhone && byEmail.id !== byPhone.id)
      return err({ kind: "duplicate-order" });
    const known = byEmail ?? byPhone;
    // One active record per student and month; a cancelled one frees it.
    const taken =
      known !== undefined &&
      this.rows.some(
        ({ order }) =>
          this.studentOf.get(order.id) === known.id &&
          order.period === draft.period &&
          order.status !== "cancelled",
      );
    if (taken) return err({ kind: "duplicate-order" });
    const sequence = (this.sequences.get(draft.year) ?? 0) + 1;
    if (this.failNext) {
      this.failNext = false;
      throw new Error("injected failure after numbering");
    }
    const { year, createdBy, paidOnCreation, ...fields } = draft;
    this.sequences.set(draft.year, sequence);
    const profile = known ?? {
      id: `student-${String(this.students.length + 1)}`,
      email: draft.student.email,
      phoneDigits: draft.student.phoneDigits,
    };
    if (!known) this.students.push(profile);
    this.activity.enrolled(profile.email, draft.student.email);
    profile.email = draft.student.email;
    profile.phoneDigits = draft.student.phoneDigits;
    const order: StoredOrder = {
      ...fields,
      id: `order-${String(this.rows.length + 1)}`,
      number: `CI-${String(year)}-${String(sequence).padStart(4, "0")}`,
      status: paidOnCreation ? "paid" : "pending_confirmation",
      ...(paidOnCreation
        ? {
            paidAt: paidOnCreation.paidAt,
            paidAmount: draft.total,
            confirmedBy: paidOnCreation.confirmedBy,
          }
        : {}),
    };
    this.studentOf.set(order.id, profile.id);
    // A request an admin created is read by its creator; a public one is new.
    this.seen.set(
      order.id,
      createdBy === undefined ? null : { by: createdBy, at: draft.requestedAt },
    );
    this.rows.push({
      order,
      audit: [
        {
          at: draft.requestedAt,
          actor: paidOnCreation?.confirmedBy ?? createdBy ?? "public",
          from: null,
          to: order.status,
          note: null,
        },
      ],
      corrections: [],
    });
    return ok(order);
  }
  /**
   * Stamps the order read the first time only. Returns `undefined` for an
   * unknown order, `true` when this call set the mark and `false` when one
   * was already there.
   */
  markSeen(orderId: string, by: string, at: Date): boolean | undefined {
    if (!this.seen.has(orderId)) return undefined;
    if (this.seen.get(orderId) !== null) return false;
    this.seen.set(orderId, { by, at });
    return true;
  }
  /** The read mark of an order, for assertions: null while unread. */
  seenMark(orderId: string): { readonly by: string; readonly at: Date } | null {
    return this.seen.get(orderId) ?? null;
  }
  holdsMonth(orderId: string, period: string): boolean {
    const studentId = this.studentOf.get(orderId);
    return this.rows.some(
      ({ order }) =>
        order.id !== orderId &&
        this.studentOf.get(order.id) === studentId &&
        order.period === period &&
        order.status !== "cancelled",
    );
  }
  applyCorrection(
    orderId: string,
    change: OrderCorrectionChange,
  ): Result<StoredOrder, DuplicateOrder | NotFound> {
    const row = this.rows.find(({ order }) => order.id === orderId);
    if (!row) return err({ kind: "not-found" });
    const period = change.target?.period ?? row.order.period;
    if (this.holdsMonth(orderId, period))
      return err({ kind: "duplicate-order" });
    const base =
      change.payment === "clear" ? withoutPayment(row.order) : row.order;
    row.order = {
      ...base,
      ...change.target,
      fee: change.fee,
      total: change.total,
      status: change.status,
      ...(change.payment === "repay" ? { paidAmount: change.total } : {}),
    };
    if (change.audit) row.audit.push(change.audit);
    row.corrections.push(change.correction);
    return ok(row.order);
  }
  corrections(orderId: string): Promise<readonly OrderCorrection[]> {
    return Promise.resolve([
      ...(this.rows.find(({ order }) => order.id === orderId)?.corrections ??
        []),
    ]);
  }
  findByPublicId(publicId: string): Promise<StoredOrder | null> {
    this.reads += 1;
    return Promise.resolve(
      this.rows.find(({ order }) => order.publicId === publicId)?.order ?? null,
    );
  }
  findForAdmin(orderId: string): Promise<StoredOrder | null> {
    this.reads += 1;
    return Promise.resolve(
      this.rows.find(({ order }) => order.id === orderId)?.order ?? null,
    );
  }
  listForAdmin(
    query: OrderRepositoryListQuery,
  ): Promise<readonly StoredOrder[]> {
    this.reads += 1;
    const page = Math.max(1, query.page ?? 1);
    const text = query.text?.toLowerCase();
    const start = (page - 1) * 50;
    return Promise.resolve(
      this.rows
        .map(({ order }) => order)
        .filter(
          (order) =>
            (!query.status || order.status === query.status) &&
            (!query.period || order.period === query.period) &&
            (!query.workshopId || order.workshopId === query.workshopId) &&
            (!text ||
              [order.number, order.student.fullName, order.student.email].some(
                (value) => value.toLowerCase().includes(text),
              )),
        )
        .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
        .slice(start, start + 50),
    );
  }
  transitionOrder(
    orderId: string,
    to: OrderStatus,
    context: TransitionContext,
  ): Promise<Result<StoredOrder, IllegalTransition | NotFound>> {
    const row = this.rows.find(({ order }) => order.id === orderId);
    if (!row) return Promise.resolve(err({ kind: "not-found" }));
    const moved = transition(
      row.order.status,
      to,
      fulfillmentOf(row.order.lines),
    );
    if (!moved.ok) return Promise.resolve(moved);
    row.audit.push({
      at: context.at,
      actor: context.actor,
      from: row.order.status,
      to,
      note: context.note ?? null,
    });
    row.order = {
      ...row.order,
      status: to,
      ...(context.paidAt
        ? {
            paidAt: context.paidAt,
            paidAmount: context.paidAmount,
            confirmedBy: context.actor,
            paymentNote: context.note,
          }
        : {}),
      ...(context.refund
        ? {
            refund: {
              ...context.refund,
              refundedBy: context.actor,
            },
          }
        : {}),
    };
    return Promise.resolve(ok(row.order));
  }
  auditTrail(orderId: string): Promise<readonly AuditEntry[]> {
    return Promise.resolve([
      ...(this.rows.find(({ order }) => order.id === orderId)?.audit ?? []),
    ]);
  }
}

/** Fake transaction adapter. Per-order queues preserve atomic admin mutations. */
export class InMemoryAdminEnrollmentStore implements AdminEnrollmentStore {
  private readonly tails = new Map<string, Promise<void>>();
  private readonly orders: OrderRepository;
  private readonly seats: SeatLedger;
  private readonly periods: AdminEnrollmentPeriodLookup;
  constructor(
    orders: OrderRepository,
    seats: SeatLedger,
    periods: AdminEnrollmentPeriodLookup,
  ) {
    this.orders = orders;
    this.seats = seats;
    this.periods = periods;
  }
  private async atomic<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
  async confirm(
    input: Parameters<AdminEnrollmentStore["confirm"]>[0],
  ): Promise<Result<Confirmed, AdminEnrollmentStoreError>> {
    return this.atomic(`order:${input.orderId}`, async () => {
      try {
        const order = await this.orders.findForAdmin(input.orderId);
        if (!order) return err({ kind: "not-found" });
        const outcome = confirmOutcome(order.status);
        if (outcome === "already-confirmed") return ok({ kind: outcome });
        if (outcome === "illegal")
          return err({
            kind: "illegal-transition",
            from: order.status,
            to: "paid",
          });
        const matches = checkPaymentAmount(order.total, input.amount);
        if (!matches.ok) return matches;
        const period = await this.periods.find(order.periodId, order.turnoId);
        if (!period) return err({ kind: "period-closed" });
        const open = periodAcceptsOrders(
          { status: period.status, period: order.period },
          input.now,
        );
        if (!open.ok) return open;
        return await this.atomic(
          `seat:${order.periodId}:${order.turnoId}`,
          async () => {
            const claimed = await this.seats.claim(
              order.periodId,
              order.turnoId,
              period.capacity,
            );
            if (!claimed.ok) return claimed;
            try {
              const moved = await this.orders.transitionOrder(
                order.id,
                "paid",
                {
                  actor: input.actor.email,
                  at: input.now,
                  ...(input.note === undefined ? {} : { note: input.note }),
                  paidAt: input.paidAt,
                  paidAmount: input.amount,
                },
              );
              if (!moved.ok) {
                await this.seats.release(order.periodId, order.turnoId);
                return moved;
              }
              if (isStocked(this.orders))
                await this.orders.takeStockLines(order.id, {
                  by: input.actor.email,
                  at: input.now,
                });
              return ok({ kind: "confirmed" });
            } catch {
              await this.seats.release(order.periodId, order.turnoId);
              return unavailable();
            }
          },
        );
      } catch {
        return unavailable();
      }
    });
  }
  async cancel(
    input: Parameters<AdminEnrollmentStore["cancel"]>[0],
  ): Promise<Result<Cancelled, AdminEnrollmentStoreError>> {
    return this.atomic(`order:${input.orderId}`, async () => {
      try {
        const order = await this.orders.findForAdmin(input.orderId);
        if (!order) return err({ kind: "not-found" });
        const outcome = cancelOutcome(order.status);
        if (outcome === "already-cancelled") return ok({ kind: outcome });
        const refund = input.refund;
        const checked = checkRefund(
          {
            status: order.status,
            ...(order.paidAmount === undefined
              ? {}
              : { paidAmount: order.paidAmount }),
            ...(order.paidAt === undefined
              ? {}
              : { paidOn: cordobaDateOf(order.paidAt) }),
          },
          refund === undefined
            ? undefined
            : { amount: refund.amount, on: refund.refundedOn },
          cordobaDateOf(input.now),
        );
        if (!checked.ok) return checked;
        const recorded =
          refund === undefined
            ? {}
            : {
                refund: {
                  amount: refund.amount,
                  refundedAt: cordobaDayStart(refund.refundedOn),
                  ...(refund.note === undefined ? {} : { note: refund.note }),
                },
              };
        if (outcome === "cancel-release") {
          return await this.atomic(
            `seat:${order.periodId}:${order.turnoId}`,
            async () => {
              await this.seats.release(order.periodId, order.turnoId);
              try {
                const moved = await this.orders.transitionOrder(
                  order.id,
                  "cancelled",
                  {
                    actor: input.actor.email,
                    at: input.now,
                    note: input.reason,
                    ...recorded,
                  },
                );
                if (moved.ok) {
                  // Received means used and handed over: those units do not come back.
                  if (
                    order.status !== "materials_received" &&
                    isStocked(this.orders)
                  )
                    await this.orders.returnStockLines(order.id, {
                      by: input.actor.email,
                      at: input.now,
                    });
                  return ok({ kind: "cancelled" });
                }
                await this.seats.claim(
                  order.periodId,
                  order.turnoId,
                  Number.MAX_SAFE_INTEGER,
                );
                return moved;
              } catch {
                await this.seats.claim(
                  order.periodId,
                  order.turnoId,
                  Number.MAX_SAFE_INTEGER,
                );
                return unavailable();
              }
            },
          );
        }
        const moved = await this.orders.transitionOrder(order.id, "cancelled", {
          actor: input.actor.email,
          at: input.now,
          note: input.reason,
          ...recorded,
        });
        return moved.ok ? ok({ kind: "cancelled" }) : moved;
      } catch {
        return unavailable();
      }
    });
  }
  async correct(
    input: Parameters<AdminEnrollmentStore["correct"]>[0],
  ): Promise<Result<Corrected, AdminEnrollmentStoreError>> {
    return this.atomic(`order:${input.orderId}`, async () => {
      try {
        const orders = this.orders;
        if (!isCorrectable(orders)) return unavailable();
        const order = await orders.findForAdmin(input.orderId);
        if (!order) return err({ kind: "not-found" });
        const target = input.target;
        const retargeted =
          target !== undefined &&
          (target.workshopId !== order.workshopId ||
            target.periodId !== order.periodId ||
            target.period !== order.period ||
            target.turnoId !== order.turnoId);
        const moved =
          target !== undefined &&
          (target.periodId !== order.periodId ||
            target.turnoId !== order.turnoId);
        const refund = input.refund;
        const plan = planCorrection(
          {
            status: order.status,
            materialsTotal: order.materialsTotal,
            total: order.total,
            ...(order.paidAmount === undefined
              ? {}
              : { paidAmount: order.paidAmount }),
            ...(order.paidAt === undefined
              ? {}
              : { paidOn: cordobaDateOf(order.paidAt) }),
          },
          {
            fee: input.fee,
            moved,
            ...(refund === undefined
              ? {}
              : { refund: { amount: refund.amount, on: refund.refundedOn } }),
          },
          cordobaDateOf(input.now),
        );
        if (!plan.ok) return plan;
        const { value: decided } = plan;
        let capacity = 0;
        if (target !== undefined && retargeted) {
          if (
            target.period !== order.period &&
            orders.holdsMonth(order.id, target.period)
          )
            return err({ kind: "duplicate-order" });
          if (moved) {
            const period = await this.periods.find(
              target.periodId,
              target.turnoId,
            );
            if (!period) return err({ kind: "period-closed" });
            const open = periodAcceptsOrders(
              { status: period.status, period: target.period },
              input.now,
            );
            if (!open.ok) return open;
            capacity = period.capacity;
          }
        }
        const correction: OrderCorrection = {
          id: crypto.randomUUID(),
          at: input.now,
          actor: input.actor.email,
          note: input.note ?? null,
          before: snapshotOf(order),
          after: {
            ...snapshotOf(order),
            ...(retargeted ? target : {}),
            fee: input.fee,
            total: decided.total,
            status: decided.status,
          },
          previousPayment:
            decided.outcome === "returned-to-pending" &&
            order.paidAt !== undefined
              ? {
                  amount: order.paidAmount ?? order.total,
                  paidAt: order.paidAt,
                  confirmedBy: order.confirmedBy ?? null,
                }
              : null,
          refund:
            decided.refund === undefined
              ? null
              : {
                  amount: decided.refund.amount,
                  refundedAt: cordobaDayStart(decided.refund.on),
                  note: refund?.note ?? null,
                },
        };
        const change = {
          ...(retargeted ? { target } : {}),
          fee: input.fee,
          total: decided.total,
          status: decided.status,
          payment:
            decided.outcome === "returned-to-pending"
              ? ("clear" as const)
              : decided.outcome === "lowered"
                ? ("repay" as const)
                : ("keep" as const),
          ...(decided.status === order.status
            ? {}
            : {
                audit: {
                  at: input.now,
                  actor: input.actor.email,
                  from: order.status,
                  to: decided.status,
                  note: input.note ?? null,
                },
              }),
          correction,
        };
        const oldKey = `seat:${order.periodId}:${order.turnoId}`;
        const newKey =
          target === undefined
            ? oldKey
            : `seat:${target.periodId}:${target.turnoId}`;
        const keys = [...new Set([oldKey, newKey])].sort();
        const locked = (
          index: number,
          work: () => Promise<Corrected | AdminEnrollmentStoreError>,
        ): Promise<Corrected | AdminEnrollmentStoreError> => {
          const key = keys[index];
          return key === undefined
            ? work()
            : this.atomic(key, () => locked(index + 1, work));
        };
        const outcome = await locked(0, async () => {
          if (decided.seat === "move" && target !== undefined) {
            const claimed = await this.seats.claim(
              target.periodId,
              target.turnoId,
              capacity,
            );
            if (!claimed.ok) return claimed.error;
          }
          try {
            const applied = orders.applyCorrection(order.id, change);
            if (!applied.ok) {
              if (decided.seat === "move" && target !== undefined)
                await this.seats.release(target.periodId, target.turnoId);
              return applied.error;
            }
          } catch (error) {
            if (decided.seat === "move" && target !== undefined)
              await this.seats.release(target.periodId, target.turnoId);
            throw error;
          }
          if (decided.seat !== "none")
            await this.seats.release(order.periodId, order.turnoId);
          if (
            decided.outcome === "returned-to-pending" &&
            order.status !== "materials_received" &&
            isStocked(orders)
          )
            await orders.returnStockLines(order.id, {
              by: input.actor.email,
              at: input.now,
            });
          return { kind: "corrected" as const, outcome: decided.outcome };
        });
        return "outcome" in outcome ? ok(outcome) : err(outcome);
      } catch {
        return unavailable();
      }
    });
  }
  async markSeen(
    input: Parameters<AdminEnrollmentStore["markSeen"]>[0],
  ): Promise<Result<SeenMark, AdminEnrollmentStoreError>> {
    return this.atomic<Result<SeenMark, AdminEnrollmentStoreError>>(
      `order:${input.orderId}`,
      () => {
        const marked = isSeenable(this.orders)
          ? this.orders.markSeen(input.orderId, input.actor.email, input.now)
          : undefined;
        if (marked === undefined)
          return Promise.resolve(err({ kind: "not-found" as const }));
        return Promise.resolve(
          ok({ kind: marked ? ("seen" as const) : ("already-seen" as const) }),
        );
      },
    );
  }
  async markMaterials(
    input: Parameters<AdminEnrollmentStore["markMaterials"]>[0],
  ): Promise<Result<void, AdminEnrollmentStoreError>> {
    return this.atomic(`order:${input.orderId}`, async () => {
      try {
        const order = await this.orders.findForAdmin(input.orderId);
        if (!order)
          return err<AdminEnrollmentStoreError>({ kind: "not-found" });
        const moved = await this.orders.transitionOrder(order.id, input.to, {
          actor: input.actor.email,
          at: input.now,
        });
        return moved.ok ? ok<undefined>(undefined) : moved;
      } catch {
        return unavailable();
      }
    });
  }
  async list(query: AdminListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const rows = await this.orders.listForAdmin({
      ...query,
      status: query.status ?? "pending_confirmation",
      page,
    });
    return {
      items: rows.map((order) => ({
        id: order.id,
        number: order.number,
        studentName: order.student.fullName,
        phoneDigits: order.student.phoneDigits,
        workshopName: order.workshopName,
        period: order.period,
        turnoLabel: order.turnoLabel,
        status: order.status,
        total: order.total,
        requestedOn: cordobaDate(order.requestedAt),
      })),
      page,
      pageSize: 50 as const,
    };
  }
  async consolidationLines(period: string) {
    const lines: ConsolidationLine[] = [];
    for (const status of ["paid", "materials_requested"] as const) {
      for (let page = 1; ; page += 1) {
        const rows = await this.orders.listForAdmin({ status, period, page });
        for (const order of rows)
          for (const line of order.lines)
            if (line.source !== "stock")
              lines.push({
                orderId: order.id,
                status,
                supplierId: line.supplierId,
                supplierName: line.supplierName,
                materialName: line.materialName,
                variantLabel: line.variantLabel,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                studentName: order.student.fullName,
                workshopName: order.workshopName,
                turnoLabel: order.turnoLabel,
              });
        if (rows.length < 50) break;
      }
    }
    let pendingOrders = 0;
    for (let page = 1; ; page += 1) {
      const rows = await this.orders.listForAdmin({
        status: "pending_confirmation",
        period,
        page,
      });
      pendingOrders += rows.length;
      if (rows.length < 50) break;
    }
    return { lines, pendingOrders };
  }
  async deliveryOrders(period: string): Promise<readonly DeliveryOrder[]> {
    const found: DeliveryOrder[] = [];
    for (const status of [
      "paid",
      "materials_requested",
      "materials_received",
    ] as const) {
      for (let page = 1; ; page += 1) {
        const rows = await this.orders.listForAdmin({ status, period, page });
        for (const order of rows)
          if (order.lines.length > 0)
            found.push({
              id: order.id,
              number: order.number,
              status,
              studentName: order.student.fullName,
              phoneDigits: order.student.phoneDigits,
              workshopName: order.workshopName,
              turnoLabel: order.turnoLabel,
              lines: order.lines.map((line) => ({
                materialName: line.materialName,
                variantLabel: line.variantLabel,
                quantity: line.quantity,
                supplierName: line.supplierName,
                unitPrice: line.unitPrice,
                ...(line.source === undefined ? {} : { source: line.source }),
              })),
            });
        if (rows.length < 50) break;
      }
    }
    return found.sort(
      (a, b) =>
        (a.studentName < b.studentName
          ? -1
          : a.studentName > b.studentName
            ? 1
            : 0) || (a.number < b.number ? -1 : a.number > b.number ? 1 : 0),
    );
  }
  async detail(
    orderId: string,
  ): Promise<Result<AdminEnrollmentDetail, AdminEnrollmentStoreError>> {
    try {
      const order = await this.orders.findForAdmin(orderId);
      if (!order) return err<AdminEnrollmentStoreError>({ kind: "not-found" });
      const period = await this.periods.find(order.periodId, order.turnoId);
      if (!period) return err<AdminEnrollmentStoreError>({ kind: "not-found" });
      return ok<AdminEnrollmentDetail>({
        ...order,
        email: order.student.email,
        phoneDigits: order.student.phoneDigits,
        seat: {
          confirmed: await this.seats.confirmedSeats(
            order.periodId,
            order.turnoId,
          ),
          capacity: period.capacity,
        },
        audit: await this.orders.auditTrail(orderId),
        corrections: isCorrectable(this.orders)
          ? await this.orders.corrections(orderId)
          : [],
      });
    } catch {
      return unavailable();
    }
  }
}
