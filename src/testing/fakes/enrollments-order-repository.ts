import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import {
  unavailable,
  type AdminEnrollmentDetail,
  type AdminEnrollmentPeriodLookup,
  type AdminEnrollmentStore,
  type AdminEnrollmentStoreError,
  type AdminListQuery,
  type Cancelled,
  type ConsolidationLine,
  type DeliveryOrder,
  type Confirmed,
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
import type { SeatLedger } from "~/modules/enrollments/application/seat-ledger";
import {
  checkPaymentAmount,
  confirmOutcome,
  cancelOutcome,
  transition,
  type IllegalTransition,
  type OrderStatus,
} from "~/modules/enrollments/domain/order-core";
import { periodAcceptsOrders } from "~/modules/enrollments/domain/period-window";

interface Row {
  order: StoredOrder;
  audit: AuditEntry[];
}

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
export class InMemoryOrderRepository implements OrderRepository {
  private readonly rows: Row[] = [];
  private readonly sequences = new Map<number, number>();
  private failNext = false;
  private reads = 0;
  failNextCreateAfterNumbering(): void {
    this.failNext = true;
  }
  size(): number {
    return this.rows.length;
  }
  readCount(): number {
    return this.reads;
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
      number: `CI-${String(year)}-${String(sequence).padStart(4, "0")}`,
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
        if (outcome === "illegal")
          return err({
            kind: "illegal-transition",
            from: order.status,
            to: "cancelled",
          });
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
                  },
                );
                if (moved.ok) return ok({ kind: "cancelled" });
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
        });
        return moved.ok ? ok({ kind: "cancelled" }) : moved;
      } catch {
        return unavailable();
      }
    });
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
            lines.push({
              orderId: order.id,
              status,
              supplierId: line.supplierId,
              supplierName: line.supplierName,
              materialName: line.materialName,
              variantLabel: line.variantLabel,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
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
      });
    } catch {
      return unavailable();
    }
  }
}
