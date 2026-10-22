import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { err, Money, ok, type NotFound, type Result } from "~/modules/_shared";
import type { DbSessionFactory } from "~/platform/db/session";
import {
  enrollmentOrder,
  orderAudit,
  orderLine,
  orderNumberSequence,
} from "~/platform/db/schema/enrollments";
import {
  formatOrderNumber,
  transition,
  type IllegalTransition,
  type OrderStatus,
} from "../domain/order-core";
import type {
  AuditEntry,
  OrderRepository,
  StoredOrder,
} from "../application/enrollment-repository";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
type OrderRow = typeof enrollmentOrder.$inferSelect;
type LineRow = typeof orderLine.$inferSelect;
type AuditRow = typeof orderAudit.$inferSelect;

function money(centavos: number): Money {
  const value = Money.fromCentavos(centavos);
  if (!value.ok) throw new Error("persisted order money is invalid");
  return value.value;
}

function toOrder(row: OrderRow, lines: readonly LineRow[]): StoredOrder {
  return {
    id: row.id,
    publicId: row.publicId,
    number: row.number,
    status: row.status as OrderStatus,
    requestedAt: row.requestedAt,
    workshopId: row.workshopId,
    workshopName: row.workshopName,
    periodId: row.periodId,
    period: row.period,
    turnoId: row.turnoId,
    turnoLabel: row.turnoLabel,
    weekday: row.weekday,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    student: {
      fullName: row.studentName,
      email: row.studentEmail,
      phoneDigits: row.studentPhoneDigits,
    },
    fee: money(row.feeCentavos),
    materialsTotal: money(row.materialsCentavos),
    total: money(row.totalCentavos),
    policyVersion: row.policyVersion,
    lines: lines.map((line) => ({
      materialId: line.materialId,
      variantId: line.variantId,
      materialName: line.materialName,
      variantLabel: line.variantLabel,
      unitPrice: money(line.unitPriceCentavos),
      quantity: line.quantity,
      supplierId: line.supplierId,
      supplierName: line.supplierName,
    })),
    ...(row.paidAt
      ? {
          paidAt: row.paidAt,
          paidAmount: money(row.paidAmountCentavos ?? 0),
          ...(row.confirmedBy === null ? {} : { confirmedBy: row.confirmedBy }),
          ...(row.paymentNote === null ? {} : { paymentNote: row.paymentNote }),
        }
      : {}),
  };
}

async function loadOrders(
  db: Db,
  condition: SQL | undefined,
  options: { readonly limit?: number; readonly offset?: number } = {},
): Promise<readonly StoredOrder[]> {
  const rows = await db
    .select()
    .from(enrollmentOrder)
    .where(condition)
    .orderBy(desc(enrollmentOrder.requestedAt), desc(enrollmentOrder.id))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);
  if (rows.length === 0) return [];
  const lines = await db
    .select()
    .from(orderLine)
    .where(
      inArray(
        orderLine.orderId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(orderLine.orderId, orderLine.position);
  const byOrder = new Map<string, LineRow[]>();
  for (const line of lines) {
    const values = byOrder.get(line.orderId) ?? [];
    values.push(line);
    byOrder.set(line.orderId, values);
  }
  return rows.map((row) => toOrder(row, byOrder.get(row.id) ?? []));
}

function hasConstraint(error: unknown, constraint: string): boolean {
  const visited = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null) {
    if (visited.has(current)) return false;
    visited.add(current);
    const candidate = current as {
      readonly code?: unknown;
      readonly constraint?: unknown;
      readonly cause?: unknown;
    };
    if (candidate.code === "23505" && candidate.constraint === constraint)
      return true;
    current = candidate.cause;
  }
  return false;
}

function toAudit(row: AuditRow): AuditEntry {
  return {
    at: row.at,
    actor: row.actor,
    from: row.from as OrderStatus | null,
    to: row.to as OrderStatus,
    note: row.note,
  };
}

/** Short-lived PostgreSQL sessions with atomic order creation and transitions. */
export function createDrizzleOrderRepository(
  openSession: DbSessionFactory,
): OrderRepository {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    create: (draft) =>
      withSession(async (db) => {
        try {
          return await db.transaction(async (tx) => {
            const sequence = await tx
              .insert(orderNumberSequence)
              .values({ year: draft.year, last: 1 })
              .onConflictDoUpdate({
                target: orderNumberSequence.year,
                set: { last: sql`${orderNumberSequence.last} + 1` },
              })
              .returning({ last: orderNumberSequence.last });
            const last = sequence[0]?.last;
            if (last === undefined)
              throw new Error("order sequence unavailable");
            const id = crypto.randomUUID();
            const number = formatOrderNumber(draft.year, last);
            await tx.insert(enrollmentOrder).values({
              id,
              publicId: draft.publicId,
              number,
              status: "pending_confirmation",
              source: "public",
              workshopId: draft.workshopId,
              workshopName: draft.workshopName,
              periodId: draft.periodId,
              period: draft.period,
              turnoId: draft.turnoId,
              turnoLabel: draft.turnoLabel,
              weekday: draft.weekday,
              startsAt: draft.startsAt,
              endsAt: draft.endsAt,
              studentName: draft.student.fullName,
              studentEmail: draft.student.email,
              studentPhoneDigits: draft.student.phoneDigits,
              feeCentavos: draft.fee.toCentavos(),
              materialsCentavos: draft.materialsTotal.toCentavos(),
              totalCentavos: draft.total.toCentavos(),
              policyVersion: draft.policyVersion,
              requestedAt: draft.requestedAt,
            });
            if (draft.lines.length > 0) {
              await tx.insert(orderLine).values(
                draft.lines.map((line, position) => ({
                  orderId: id,
                  position,
                  materialId: line.materialId,
                  variantId: line.variantId,
                  materialName: line.materialName,
                  variantLabel: line.variantLabel,
                  unitPriceCentavos: line.unitPrice.toCentavos(),
                  quantity: line.quantity,
                  supplierId: line.supplierId,
                  supplierName: line.supplierName,
                })),
              );
            }
            await tx.insert(orderAudit).values({
              id: crypto.randomUUID(),
              orderId: id,
              at: draft.requestedAt,
              actor: "public",
              from: null,
              to: "pending_confirmation",
              note: null,
            });
            const persistedRows = await tx
              .select()
              .from(enrollmentOrder)
              .where(eq(enrollmentOrder.id, id));
            const persisted = persistedRows[0];
            if (!persisted) throw new Error("created order unavailable");
            const persistedLines = await tx
              .select()
              .from(orderLine)
              .where(eq(orderLine.orderId, id))
              .orderBy(orderLine.position);
            return ok(toOrder(persisted, persistedLines));
          });
        } catch (error) {
          if (hasConstraint(error, "enrollment_order_active_duplicate_unique"))
            return err({ kind: "duplicate-order" });
          throw error;
        }
      }),

    findByPublicId: (publicId) =>
      withSession(async (db) => {
        const values = await loadOrders(
          db,
          eq(enrollmentOrder.publicId, publicId),
        );
        return values[0] ?? null;
      }),

    findForAdmin: (orderId) =>
      withSession(async (db) => {
        const values = await loadOrders(db, eq(enrollmentOrder.id, orderId));
        return values[0] ?? null;
      }),

    listForAdmin: (query) =>
      withSession((db) => {
        const conditions: SQL[] = [];
        if (query.status)
          conditions.push(eq(enrollmentOrder.status, query.status));
        if (query.period)
          conditions.push(eq(enrollmentOrder.period, query.period));
        if (query.workshopId)
          conditions.push(eq(enrollmentOrder.workshopId, query.workshopId));
        if (query.text) {
          const text = `%${query.text}%`;
          const textCondition = or(
            ilike(enrollmentOrder.number, text),
            ilike(enrollmentOrder.studentName, text),
            ilike(enrollmentOrder.studentEmail, text),
          );
          if (textCondition) conditions.push(textCondition);
        }
        const page = Math.max(1, query.page ?? 1);
        return loadOrders(
          db,
          conditions.length > 0 ? and(...conditions) : undefined,
          { offset: (page - 1) * 50 },
        );
      }),

    transitionOrder: (orderId, to, context) =>
      withSession(
        async (
          db,
        ): Promise<Result<StoredOrder, IllegalTransition | NotFound>> =>
          db.transaction(async (tx) => {
            const rows = await tx
              .select()
              .from(enrollmentOrder)
              .where(eq(enrollmentOrder.id, orderId))
              .for("update");
            const current = rows[0];
            if (!current) return err({ kind: "not-found" });
            const lineCount = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(orderLine)
              .where(eq(orderLine.orderId, orderId));
            const moved = transition(current.status as OrderStatus, to, {
              hasMaterialLines: (lineCount[0]?.count ?? 0) > 0,
            });
            if (!moved.ok) return moved;
            await tx
              .update(enrollmentOrder)
              .set({
                status: to,
                ...(context.paidAt
                  ? {
                      paidAt: context.paidAt,
                      paidAmountCentavos: context.paidAmount?.toCentavos(),
                      confirmedBy: context.actor,
                      paymentNote: context.note ?? null,
                    }
                  : {}),
                ...(to === "cancelled"
                  ? {
                      cancelledAt: context.at,
                      cancelReason: context.note ?? null,
                      cancelledBy: context.actor,
                    }
                  : {}),
              })
              .where(eq(enrollmentOrder.id, orderId));
            await tx.insert(orderAudit).values({
              id: crypto.randomUUID(),
              orderId,
              at: context.at,
              actor: context.actor,
              from: current.status,
              to,
              note: context.note ?? null,
            });
            const lines = await tx
              .select()
              .from(orderLine)
              .where(eq(orderLine.orderId, orderId))
              .orderBy(orderLine.position);
            return ok(
              toOrder(
                {
                  ...current,
                  status: to,
                  ...(context.paidAt
                    ? {
                        paidAt: context.paidAt,
                        paidAmountCentavos:
                          context.paidAmount?.toCentavos() ?? null,
                        confirmedBy: context.actor,
                        paymentNote: context.note ?? null,
                      }
                    : {}),
                },
                lines,
              ),
            );
          }),
      ),

    auditTrail: (orderId) =>
      withSession(async (db) =>
        (
          await db
            .select()
            .from(orderAudit)
            .where(eq(orderAudit.orderId, orderId))
            .orderBy(orderAudit.at, orderAudit.id)
        ).map(toAudit),
      ),
  };
}
