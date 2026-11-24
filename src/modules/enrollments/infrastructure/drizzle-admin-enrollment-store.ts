import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { err, Money, ok, type Result } from "~/modules/_shared";
import type { DbSessionFactory } from "~/platform/db/session";
import {
  enrollmentOrder,
  orderAudit,
  orderCorrection,
  orderLine,
  turnoSeatCounter,
} from "~/platform/db/schema/enrollments";
import {
  cancelOutcome,
  checkPaymentAmount,
  checkRefund,
  confirmOutcome,
  cordobaDateOf,
  cordobaDayStart,
  holdsSeat,
  transition,
  type LineSource,
  type OrderKind,
  type OrderStatus,
} from "../domain/order-core";
import { planCorrection } from "../domain/order-correction";
import { periodAcceptsOrders } from "../domain/period-window";
import type {
  AdminEnrollmentDetail,
  AdminEnrollmentPeriodLookup,
  AdminEnrollmentStore,
  AdminEnrollmentStoreError,
  AdminListItem,
  AdminListQuery,
  Cancelled,
  Confirmed,
  ConsolidationLine,
  Corrected,
  CorrectionSnapshot,
  CorrectionTarget,
  DeliveryOrder,
  MaterialSaleStore,
  SeenMark,
  OrderCorrection,
} from "../application/admin-enrollment-store";
import type {
  AuditEntry,
  StoredOrder,
} from "../application/enrollment-repository";
import type { OrderStockPort } from "../application/order-stock";
import { nextOrderNumber } from "./order-number";
import { returnStockLines, takeStockLines } from "./order-stock-lines";
import { claimSeat } from "./seat-claim";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
type OrderRow = typeof enrollmentOrder.$inferSelect;
type LineRow = typeof orderLine.$inferSelect;
type AuditRow = typeof orderAudit.$inferSelect;
type CorrectionRow = typeof orderCorrection.$inferSelect;

/** Thrown inside the correction transaction to roll it back with a refusal. */
class CorrectionRollback extends Error {
  readonly refusal: AdminEnrollmentStoreError;
  constructor(refusal: AdminEnrollmentStoreError) {
    super("correction refused");
    this.refusal = refusal;
  }
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

/** Releases one seat of a turno inside the caller's transaction; a missing counter aborts it. */
async function releaseSeat(
  tx: Db,
  turno: { readonly periodId: string; readonly turnoId: string },
): Promise<void> {
  const released = await tx
    .update(turnoSeatCounter)
    .set({
      confirmedSeats: sql`${turnoSeatCounter.confirmedSeats} - 1`,
    })
    .where(
      and(
        eq(turnoSeatCounter.periodId, turno.periodId),
        eq(turnoSeatCounter.turnoId, turno.turnoId),
        sql`${turnoSeatCounter.confirmedSeats} > 0`,
      ),
    )
    .returning({ confirmedSeats: turnoSeatCounter.confirmedSeats });
  if (released.length === 0) throw new Error("seat counter unavailable");
}

function toCorrection(row: CorrectionRow): OrderCorrection {
  const before: CorrectionSnapshot = {
    workshopId: row.beforeWorkshopId,
    workshopName: row.beforeWorkshopName,
    periodId: row.beforePeriodId,
    period: row.beforePeriod,
    turnoId: row.beforeTurnoId,
    turnoLabel: row.beforeTurnoLabel,
    weekday: row.beforeWeekday,
    startsAt: row.beforeStartsAt,
    endsAt: row.beforeEndsAt,
    fee: money(row.beforeFeeCentavos),
    total: money(row.beforeTotalCentavos),
    status: row.beforeStatus as OrderStatus,
  };
  const after: CorrectionSnapshot = {
    workshopId: row.afterWorkshopId,
    workshopName: row.afterWorkshopName,
    periodId: row.afterPeriodId,
    period: row.afterPeriod,
    turnoId: row.afterTurnoId,
    turnoLabel: row.afterTurnoLabel,
    weekday: row.afterWeekday,
    startsAt: row.afterStartsAt,
    endsAt: row.afterEndsAt,
    fee: money(row.afterFeeCentavos),
    total: money(row.afterTotalCentavos),
    status: row.afterStatus as OrderStatus,
  };
  return {
    id: row.id,
    at: row.at,
    actor: row.actor,
    note: row.note,
    before,
    after,
    previousPayment:
      row.previousPaidAmountCentavos === null || row.previousPaidAt === null
        ? null
        : {
            amount: money(row.previousPaidAmountCentavos),
            paidAt: row.previousPaidAt,
            confirmedBy: row.previousConfirmedBy,
          },
    refund:
      row.refundedAmountCentavos === null || row.refundedAt === null
        ? null
        : {
            amount: money(row.refundedAmountCentavos),
            refundedAt: row.refundedAt,
            note: row.refundNote,
          },
  };
}

function snapshotOfRow(row: OrderRow): CorrectionSnapshot {
  return {
    workshopId: row.workshopId,
    workshopName: row.workshopName,
    periodId: row.periodId,
    period: row.period,
    turnoId: row.turnoId,
    turnoLabel: row.turnoLabel,
    weekday: row.weekday,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    fee: money(row.feeCentavos),
    total: money(row.totalCentavos),
    status: row.status as OrderStatus,
  };
}

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
    ...(row.kind === "material_sale" ? { kind: row.kind } : {}),
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
    ...(row.conditionsVersion === null || row.privacyVersion === null
      ? {}
      : {
          acceptance: {
            conditionsVersion: row.conditionsVersion,
            privacyVersion: row.privacyVersion,
          },
        }),
    lines: lines.map((line) => ({
      materialId: line.materialId,
      variantId: line.variantId,
      materialName: line.materialName,
      variantLabel: line.variantLabel,
      unitPrice: money(line.unitPriceCentavos),
      quantity: line.quantity,
      supplierId: line.supplierId,
      supplierName: line.supplierName,
      source: line.source as LineSource,
      unitCost:
        line.unitCostCentavos === null ? null : money(line.unitCostCentavos),
    })),
    ...(row.paidAt
      ? {
          paidAt: row.paidAt,
          paidAmount: money(row.paidAmountCentavos ?? 0),
          ...(row.confirmedBy === null ? {} : { confirmedBy: row.confirmedBy }),
          ...(row.paymentNote === null ? {} : { paymentNote: row.paymentNote }),
        }
      : {}),
    ...(row.refundedAmountCentavos === null ||
    row.refundedAt === null ||
    row.refundedBy === null
      ? {}
      : {
          refund: {
            amount: money(row.refundedAmountCentavos),
            refundedAt: row.refundedAt,
            ...(row.refundNote === null ? {} : { note: row.refundNote }),
            refundedBy: row.refundedBy,
          },
        }),
  };
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

function cordobaDate(instant: Date): string {
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
  if (!year || !month || !day) throw new Error("Córdoba date unavailable");
  return `${year}-${month}-${day}`;
}

/**
 * The sole PostgreSQL atomic boundary for administrative enrollment mutations.
 * Every mutation locks the order first; seat mutations then lock the counter,
 * move the stock units of the order's `stock` lines, update the order, and
 * append the audit row last in that transaction.
 */
export function createDrizzleAdminEnrollmentStore(
  openSession: DbSessionFactory,
  periods: AdminEnrollmentPeriodLookup,
  stock: OrderStockPort<Db>,
): AdminEnrollmentStore & MaterialSaleStore {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  async function linesFor(
    db: Db,
    orderId: string,
  ): Promise<readonly LineRow[]> {
    return db
      .select()
      .from(orderLine)
      .where(eq(orderLine.orderId, orderId))
      .orderBy(orderLine.position);
  }

  async function appendAudit(
    db: Db,
    input: {
      orderId: string;
      at: Date;
      actor: string;
      from: OrderStatus;
      to: OrderStatus;
      note?: string;
    },
  ): Promise<void> {
    await db.insert(orderAudit).values({
      id: crypto.randomUUID(),
      orderId: input.orderId,
      at: input.at,
      actor: input.actor,
      from: input.from,
      to: input.to,
      note: input.note ?? null,
    });
  }

  return {
    async createSale(
      input,
    ): Promise<
      Result<
        { readonly id: string; readonly number: string },
        AdminEnrollmentStoreError
      >
    > {
      try {
        return await withSession(async (db) =>
          db.transaction(async (tx) => {
            const rows = await tx
              .select()
              .from(enrollmentOrder)
              .where(eq(enrollmentOrder.id, input.parentOrderId))
              .for("update");
            const parent = rows[0];
            if (!parent) return err({ kind: "not-found" });
            if (parent.kind !== "enrollment" || parent.status === "cancelled")
              return err({ kind: "not-sellable" });
            const number = await nextOrderNumber(tx, input.year);
            const id = crypto.randomUUID();
            const total = input.materialsTotal.toCentavos();
            const paid = input.paidAt;
            // The sale copies the monthly record's student, workshop, month and
            // turno; it holds no seat and charges no fee.
            await tx.insert(enrollmentOrder).values({
              id,
              studentId: parent.studentId,
              publicId: input.publicId,
              number,
              // A sale the owner already collected is stored paid in full.
              status: paid ? "paid" : "pending_confirmation",
              source: "public",
              workshopId: parent.workshopId,
              periodId: parent.periodId,
              period: parent.period,
              turnoId: parent.turnoId,
              workshopName: parent.workshopName,
              turnoLabel: parent.turnoLabel,
              weekday: parent.weekday,
              startsAt: parent.startsAt,
              endsAt: parent.endsAt,
              studentName: parent.studentName,
              studentEmail: parent.studentEmail,
              studentPhoneDigits: parent.studentPhoneDigits,
              feeCentavos: 0,
              materialsCentavos: total,
              totalCentavos: total,
              policyVersion: parent.policyVersion,
              // The sale carries the acceptance of the record it belongs to.
              conditionsVersion: parent.conditionsVersion,
              privacyVersion: parent.privacyVersion,
              requestedAt: input.now,
              kind: "material_sale",
              parentOrderId: parent.id,
              // The owner who sells it already knows about it.
              seenAt: input.now,
              seenBy: input.actor.email,
              ...(paid
                ? {
                    paidAt: paid,
                    paidAmountCentavos: total,
                    confirmedBy: input.actor.email,
                  }
                : {}),
            });
            await tx.insert(orderLine).values(
              input.lines.map((line, position) => ({
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
                source: line.source ?? "supplier",
                unitCostCentavos: line.unitCost?.toCentavos() ?? null,
              })),
            );
            // A sale holds no seat; paying it takes its stock lines, exactly as
            // confirming it later would, but in this same transaction.
            if (paid)
              await takeStockLines(tx, stock, id, {
                by: input.actor.email,
                at: input.now,
              });
            await tx.insert(orderAudit).values({
              id: crypto.randomUUID(),
              orderId: id,
              at: input.now,
              actor: input.actor.email,
              from: null,
              to: paid ? "paid" : "pending_confirmation",
              note: null,
            });
            return ok({ id, number });
          }),
        );
      } catch {
        return err({ kind: "unavailable" });
      }
    },

    async confirm(
      input,
    ): Promise<Result<Confirmed, AdminEnrollmentStoreError>> {
      try {
        return await withSession(async (db) =>
          db.transaction(async (tx) => {
            const rows = await tx
              .select()
              .from(enrollmentOrder)
              .where(eq(enrollmentOrder.id, input.orderId))
              .for("update");
            const order = rows[0];
            if (!order) return err({ kind: "not-found" });

            const outcome = confirmOutcome(order.status as OrderStatus);
            if (outcome === "already-confirmed") return ok({ kind: outcome });
            if (outcome === "illegal")
              return err({
                kind: "illegal-transition",
                from: order.status as OrderStatus,
                to: "paid",
              });
            const amount = checkPaymentAmount(
              money(order.totalCentavos),
              input.amount,
            );
            if (!amount.ok) return amount;
            // Only a monthly record holds a seat; a sale is paid whatever the
            // turno's occupancy or the month's window.
            if (holdsSeat(order.kind as OrderKind)) {
              const period = await periods.find(order.periodId, order.turnoId);
              if (!period) return err({ kind: "period-closed" });
              const open = periodAcceptsOrders(
                { status: period.status, period: order.period },
                input.now,
              );
              if (!open.ok) return open;

              const claimed = await claimSeat(tx, {
                periodId: order.periodId,
                turnoId: order.turnoId,
                capacity: period.capacity,
              });
              if (!claimed) return err({ kind: "turno-full" });
            }
            // A line whose stock ran out becomes a supplier line; the payment stands.
            await takeStockLines(tx, stock, order.id, {
              by: input.actor.email,
              at: input.now,
            });

            await tx
              .update(enrollmentOrder)
              .set({
                status: "paid",
                paidAt: input.paidAt,
                paidAmountCentavos: input.amount.toCentavos(),
                confirmedBy: input.actor.email,
                paymentNote: input.note ?? null,
              })
              .where(eq(enrollmentOrder.id, order.id));
            await appendAudit(tx, {
              orderId: order.id,
              at: input.now,
              actor: input.actor.email,
              from: "pending_confirmation",
              to: "paid",
              ...(input.note === undefined ? {} : { note: input.note }),
            });
            return ok({ kind: "confirmed" });
          }),
        );
      } catch {
        return err({ kind: "unavailable" });
      }
    },

    async cancel(input): Promise<Result<Cancelled, AdminEnrollmentStoreError>> {
      try {
        return await withSession(async (db) =>
          db.transaction(async (tx) => {
            const rows = await tx
              .select()
              .from(enrollmentOrder)
              .where(eq(enrollmentOrder.id, input.orderId))
              .for("update");
            const order = rows[0];
            if (!order) return err({ kind: "not-found" });
            const outcome = cancelOutcome(order.status as OrderStatus);
            if (outcome === "already-cancelled") return ok({ kind: outcome });
            const refund = input.refund;
            const checked = checkRefund(
              {
                status: order.status as OrderStatus,
                ...(order.paidAmountCentavos === null
                  ? {}
                  : { paidAmount: money(order.paidAmountCentavos) }),
                ...(order.paidAt === null
                  ? {}
                  : { paidOn: cordobaDateOf(order.paidAt) }),
              },
              refund === undefined
                ? undefined
                : { amount: refund.amount, on: refund.refundedOn },
              cordobaDateOf(input.now),
            );
            if (!checked.ok) return checked;

            if (outcome === "cancel-release") {
              if (holdsSeat(order.kind as OrderKind))
                await releaseSeat(tx, order);
              // Received means used and handed over: those units do not come back.
              if (order.status !== "materials_received")
                await returnStockLines(tx, stock, order.id, {
                  by: input.actor.email,
                  at: input.now,
                });
            }

            await tx
              .update(enrollmentOrder)
              .set({
                status: "cancelled",
                cancelledAt: input.now,
                cancelReason: input.reason,
                cancelledBy: input.actor.email,
                ...(refund === undefined
                  ? {}
                  : {
                      refundedAmountCentavos: refund.amount.toCentavos(),
                      refundedAt: cordobaDayStart(refund.refundedOn),
                      refundNote: refund.note ?? null,
                      refundedBy: input.actor.email,
                    }),
              })
              .where(eq(enrollmentOrder.id, order.id));
            await appendAudit(tx, {
              orderId: order.id,
              at: input.now,
              actor: input.actor.email,
              from: order.status as OrderStatus,
              to: "cancelled",
              note: input.reason,
            });
            return ok({ kind: "cancelled" });
          }),
        );
      } catch {
        return err({ kind: "unavailable" });
      }
    },

    async correct(
      input,
    ): Promise<Result<Corrected, AdminEnrollmentStoreError>> {
      try {
        return await withSession(async (db) =>
          db.transaction(async (tx) => {
            const rows = await tx
              .select()
              .from(enrollmentOrder)
              .where(eq(enrollmentOrder.id, input.orderId))
              .for("update");
            const order = rows[0];
            if (!order) return err({ kind: "not-found" });
            // A sale has no workshop, turno or fee of its own to correct.
            if (!holdsSeat(order.kind as OrderKind))
              return err({ kind: "not-correctable" });
            const status = order.status as OrderStatus;
            const target: CorrectionTarget | undefined = input.target;
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
                status,
                materialsTotal: money(order.materialsCentavos),
                total: money(order.totalCentavos),
                ...(order.paidAmountCentavos === null
                  ? {}
                  : { paidAmount: money(order.paidAmountCentavos) }),
                ...(order.paidAt === null
                  ? {}
                  : { paidOn: cordobaDateOf(order.paidAt) }),
              },
              {
                fee: input.fee,
                moved,
                ...(refund === undefined
                  ? {}
                  : {
                      refund: { amount: refund.amount, on: refund.refundedOn },
                    }),
              },
              cordobaDateOf(input.now),
            );
            if (!plan.ok) return plan;
            const decided = plan.value;

            let capacity = 0;
            if (target !== undefined && retargeted) {
              if (target.period !== order.period) {
                const held = await tx
                  .select({ id: enrollmentOrder.id })
                  .from(enrollmentOrder)
                  .where(
                    and(
                      eq(enrollmentOrder.studentId, order.studentId),
                      eq(enrollmentOrder.period, target.period),
                      eq(enrollmentOrder.kind, "enrollment"),
                      sql`${enrollmentOrder.status} <> 'cancelled'`,
                      sql`${enrollmentOrder.id} <> ${order.id}`,
                    ),
                  )
                  .limit(1);
                if (held.length > 0) return err({ kind: "duplicate-order" });
              }
              if (moved) {
                const period = await periods.find(
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

            // Counter rows are touched in key order so two opposite moves
            // never wait on each other; a full target rolls everything back.
            const steps: { key: string; run: () => Promise<void> }[] = [];
            if (decided.seat !== "none")
              steps.push({
                key: `${order.periodId}:${order.turnoId}`,
                run: () => releaseSeat(tx, order),
              });
            if (decided.seat === "move" && target !== undefined)
              steps.push({
                key: `${target.periodId}:${target.turnoId}`,
                run: async () => {
                  const claimed = await claimSeat(tx, {
                    periodId: target.periodId,
                    turnoId: target.turnoId,
                    capacity,
                  });
                  if (!claimed)
                    throw new CorrectionRollback({ kind: "turno-full" });
                },
              });
            steps.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
            for (const step of steps) await step.run();
            if (
              decided.outcome === "returned-to-pending" &&
              status !== "materials_received"
            )
              await returnStockLines(tx, stock, order.id, {
                by: input.actor.email,
                at: input.now,
              });

            const location = retargeted ? target : undefined;
            await tx
              .update(enrollmentOrder)
              .set({
                ...(location === undefined
                  ? {}
                  : {
                      workshopId: location.workshopId,
                      workshopName: location.workshopName,
                      periodId: location.periodId,
                      period: location.period,
                      turnoId: location.turnoId,
                      turnoLabel: location.turnoLabel,
                      weekday: location.weekday,
                      startsAt: location.startsAt,
                      endsAt: location.endsAt,
                    }),
                feeCentavos: input.fee.toCentavos(),
                totalCentavos: decided.total.toCentavos(),
                status: decided.status,
                ...(decided.outcome === "returned-to-pending"
                  ? {
                      paidAt: null,
                      paidAmountCentavos: null,
                      confirmedBy: null,
                      paymentNote: null,
                    }
                  : {}),
                ...(decided.outcome === "lowered"
                  ? { paidAmountCentavos: decided.total.toCentavos() }
                  : {}),
              })
              .where(eq(enrollmentOrder.id, order.id));

            const before = snapshotOfRow(order);
            const after = {
              ...before,
              ...(location ?? {}),
              fee: input.fee,
              total: decided.total,
              status: decided.status,
            };
            const previous =
              decided.outcome === "returned-to-pending" && order.paidAt !== null
                ? {
                    previousPaidAmountCentavos:
                      order.paidAmountCentavos ?? order.totalCentavos,
                    previousPaidAt: order.paidAt,
                    previousConfirmedBy: order.confirmedBy,
                  }
                : {
                    previousPaidAmountCentavos: null,
                    previousPaidAt: null,
                    previousConfirmedBy: null,
                  };
            await tx.insert(orderCorrection).values({
              id: crypto.randomUUID(),
              orderId: order.id,
              at: input.now,
              actor: input.actor.email,
              note: input.note ?? null,
              beforeWorkshopId: before.workshopId,
              beforeWorkshopName: before.workshopName,
              beforePeriodId: before.periodId,
              beforePeriod: before.period,
              beforeTurnoId: before.turnoId,
              beforeTurnoLabel: before.turnoLabel,
              beforeWeekday: before.weekday,
              beforeStartsAt: before.startsAt,
              beforeEndsAt: before.endsAt,
              beforeFeeCentavos: before.fee.toCentavos(),
              beforeTotalCentavos: before.total.toCentavos(),
              beforeStatus: before.status,
              afterWorkshopId: after.workshopId,
              afterWorkshopName: after.workshopName,
              afterPeriodId: after.periodId,
              afterPeriod: after.period,
              afterTurnoId: after.turnoId,
              afterTurnoLabel: after.turnoLabel,
              afterWeekday: after.weekday,
              afterStartsAt: after.startsAt,
              afterEndsAt: after.endsAt,
              afterFeeCentavos: after.fee.toCentavos(),
              afterTotalCentavos: after.total.toCentavos(),
              afterStatus: after.status,
              ...previous,
              refundedAmountCentavos:
                decided.refund === undefined
                  ? null
                  : decided.refund.amount.toCentavos(),
              refundedAt:
                decided.refund === undefined
                  ? null
                  : cordobaDayStart(decided.refund.on),
              refundNote:
                decided.refund === undefined ? null : (refund?.note ?? null),
            });
            if (decided.status !== status)
              await appendAudit(tx, {
                orderId: order.id,
                at: input.now,
                actor: input.actor.email,
                from: status,
                to: decided.status,
                ...(input.note === undefined ? {} : { note: input.note }),
              });
            return ok({ kind: "corrected", outcome: decided.outcome });
          }),
        );
      } catch (error) {
        if (error instanceof CorrectionRollback) return err(error.refusal);
        if (
          hasConstraint(error, "enrollment_order_student_period_active_unique")
        )
          return err({ kind: "duplicate-order" });
        return err({ kind: "unavailable" });
      }
    },

    async markSeen(
      input,
    ): Promise<Result<SeenMark, AdminEnrollmentStoreError>> {
      try {
        return await withSession(async (db) => {
          // One conditional update: the first opener stamps it and a later
          // one (or a concurrent one) never overwrites the mark.
          const marked = await db
            .update(enrollmentOrder)
            .set({ seenAt: input.now, seenBy: input.actor.email })
            .where(
              and(
                eq(enrollmentOrder.id, input.orderId),
                isNull(enrollmentOrder.seenAt),
              ),
            )
            .returning({ id: enrollmentOrder.id });
          if (marked.length > 0) return ok<SeenMark>({ kind: "seen" });
          const known = await db
            .select({ id: enrollmentOrder.id })
            .from(enrollmentOrder)
            .where(eq(enrollmentOrder.id, input.orderId));
          return known.length > 0
            ? ok<SeenMark>({ kind: "already-seen" })
            : err({ kind: "not-found" as const });
        });
      } catch {
        return err({ kind: "unavailable" });
      }
    },

    async markMaterials(
      input,
    ): Promise<Result<void, AdminEnrollmentStoreError>> {
      try {
        return await withSession(async (db) =>
          db.transaction(async (tx) => {
            const rows = await tx
              .select()
              .from(enrollmentOrder)
              .where(eq(enrollmentOrder.id, input.orderId))
              .for("update");
            const order = rows[0];
            if (!order) return err({ kind: "not-found" });
            const lines = await tx
              .select({
                count: sql<number>`count(*)::int`,
                fromSupplier: sql<number>`(count(*) filter (where ${orderLine.source} = 'supplier'))::int`,
              })
              .from(orderLine)
              .where(eq(orderLine.orderId, order.id));
            const moved = transition(order.status as OrderStatus, input.to, {
              hasMaterialLines: (lines[0]?.count ?? 0) > 0,
              hasSupplierLines: (lines[0]?.fromSupplier ?? 0) > 0,
            });
            if (!moved.ok) return moved;
            await tx
              .update(enrollmentOrder)
              .set({ status: input.to })
              .where(eq(enrollmentOrder.id, order.id));
            await appendAudit(tx, {
              orderId: order.id,
              at: input.now,
              actor: input.actor.email,
              from: order.status as OrderStatus,
              to: input.to,
            });
            return ok(undefined);
          }),
        );
      } catch {
        return err({ kind: "unavailable" });
      }
    },

    async consolidationLines(period: string) {
      return withSession(async (db) => {
        const rows = await db
          .select({
            orderId: orderLine.orderId,
            status: enrollmentOrder.status,
            supplierId: orderLine.supplierId,
            supplierName: orderLine.supplierName,
            materialName: orderLine.materialName,
            variantLabel: orderLine.variantLabel,
            quantity: orderLine.quantity,
            unitPriceCentavos: orderLine.unitPriceCentavos,
            studentName: enrollmentOrder.studentName,
            workshopName: enrollmentOrder.workshopName,
            turnoLabel: enrollmentOrder.turnoLabel,
          })
          .from(orderLine)
          .innerJoin(enrollmentOrder, eq(orderLine.orderId, enrollmentOrder.id))
          .where(
            and(
              eq(enrollmentOrder.period, period),
              inArray(enrollmentOrder.status, ["paid", "materials_requested"]),
              eq(orderLine.source, "supplier"),
            ),
          )
          .orderBy(asc(orderLine.orderId), asc(orderLine.position));
        const [pending] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollmentOrder)
          .where(
            and(
              eq(enrollmentOrder.period, period),
              eq(enrollmentOrder.status, "pending_confirmation"),
            ),
          );
        const lines: readonly ConsolidationLine[] = rows.map((row) => ({
          orderId: row.orderId,
          status: row.status as ConsolidationLine["status"],
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          materialName: row.materialName,
          variantLabel: row.variantLabel,
          quantity: row.quantity,
          unitPrice: money(row.unitPriceCentavos),
          studentName: row.studentName,
          workshopName: row.workshopName,
          turnoLabel: row.turnoLabel,
        }));
        return { lines, pendingOrders: pending?.count ?? 0 };
      });
    },

    async deliveryOrders(period: string): Promise<readonly DeliveryOrder[]> {
      return withSession(async (db) => {
        const orders = await db
          .select()
          .from(enrollmentOrder)
          .where(
            and(
              eq(enrollmentOrder.period, period),
              inArray(enrollmentOrder.status, [
                "paid",
                "materials_requested",
                "materials_received",
              ]),
            ),
          )
          .orderBy(
            asc(enrollmentOrder.studentName),
            asc(enrollmentOrder.number),
          );
        if (orders.length === 0) return [];
        const lineRows = await db
          .select()
          .from(orderLine)
          .where(
            inArray(
              orderLine.orderId,
              orders.map((order) => order.id),
            ),
          )
          .orderBy(asc(orderLine.orderId), asc(orderLine.position));
        return orders.flatMap((order): DeliveryOrder[] => {
          const lines = lineRows
            .filter((line) => line.orderId === order.id)
            .map((line) => ({
              materialName: line.materialName,
              variantLabel: line.variantLabel,
              quantity: line.quantity,
              supplierName: line.supplierName,
              unitPrice: money(line.unitPriceCentavos),
              source: line.source as LineSource,
            }));
          return lines.length === 0
            ? []
            : [
                {
                  id: order.id,
                  number: order.number,
                  ...(order.kind === "material_sale"
                    ? { kind: order.kind }
                    : {}),
                  status: order.status as DeliveryOrder["status"],
                  studentName: order.studentName,
                  phoneDigits: order.studentPhoneDigits,
                  workshopName: order.workshopName,
                  turnoLabel: order.turnoLabel,
                  lines,
                },
              ];
        });
      });
    },

    async list(query: AdminListQuery) {
      const page = Math.max(1, query.page ?? 1);
      const conditions: SQL[] = [
        eq(enrollmentOrder.status, query.status ?? "pending_confirmation"),
      ];
      if (query.period)
        conditions.push(eq(enrollmentOrder.period, query.period));
      if (query.workshopId)
        conditions.push(eq(enrollmentOrder.workshopId, query.workshopId));
      if (query.text) {
        const text = `%${query.text}%`;
        const match = or(
          ilike(enrollmentOrder.number, text),
          ilike(enrollmentOrder.studentName, text),
          ilike(enrollmentOrder.studentEmail, text),
        );
        if (match) conditions.push(match);
      }
      const rows = await withSession((db) =>
        db
          .select()
          .from(enrollmentOrder)
          .where(and(...conditions))
          .orderBy(desc(enrollmentOrder.requestedAt), desc(enrollmentOrder.id))
          .limit(50)
          .offset((page - 1) * 50),
      );
      const items: readonly AdminListItem[] = rows.map((row) => ({
        id: row.id,
        number: row.number,
        studentName: row.studentName,
        phoneDigits: row.studentPhoneDigits,
        workshopName: row.workshopName,
        period: row.period,
        turnoLabel: row.turnoLabel,
        status: row.status as OrderStatus,
        total: money(row.totalCentavos),
        requestedOn: cordobaDate(row.requestedAt),
        ...(row.kind === "material_sale" ? { kind: row.kind } : {}),
      }));
      return { items, page, pageSize: 50 as const };
    },

    async detail(
      orderId,
    ): Promise<Result<AdminEnrollmentDetail, AdminEnrollmentStoreError>> {
      try {
        return await withSession(async (db) => {
          const rows = await db
            .select()
            .from(enrollmentOrder)
            .where(eq(enrollmentOrder.id, orderId));
          const order = rows[0];
          if (!order) return err({ kind: "not-found" });
          const period = await periods.find(order.periodId, order.turnoId);
          if (!period) return err({ kind: "not-found" });
          const lines = await linesFor(db, order.id);
          const audits = await db
            .select()
            .from(orderAudit)
            .where(eq(orderAudit.orderId, order.id))
            .orderBy(orderAudit.at, orderAudit.id);
          const corrections = await db
            .select()
            .from(orderCorrection)
            .where(eq(orderCorrection.orderId, order.id))
            .orderBy(orderCorrection.at, orderCorrection.id);
          const counter = await db
            .select({ confirmed: turnoSeatCounter.confirmedSeats })
            .from(turnoSeatCounter)
            .where(
              and(
                eq(turnoSeatCounter.periodId, order.periodId),
                eq(turnoSeatCounter.turnoId, order.turnoId),
              ),
            );
          const stored = toOrder(order, lines);
          const parent =
            order.parentOrderId === null
              ? undefined
              : (
                  await db
                    .select({
                      id: enrollmentOrder.id,
                      number: enrollmentOrder.number,
                    })
                    .from(enrollmentOrder)
                    .where(eq(enrollmentOrder.id, order.parentOrderId))
                )[0];
          const sales =
            order.kind === "enrollment"
              ? await db
                  .select()
                  .from(enrollmentOrder)
                  .where(eq(enrollmentOrder.parentOrderId, order.id))
                  .orderBy(enrollmentOrder.requestedAt, enrollmentOrder.id)
              : [];
          return ok({
            ...stored,
            kind: order.kind as OrderKind,
            ...(parent === undefined ? {} : { parent }),
            sales: sales.map((sale) => ({
              id: sale.id,
              number: sale.number,
              status: sale.status as OrderStatus,
              total: money(sale.totalCentavos),
              requestedAt: sale.requestedAt,
            })),
            email: stored.student.email,
            phoneDigits: stored.student.phoneDigits,
            seat: {
              confirmed: counter[0]?.confirmed ?? 0,
              capacity: period.capacity,
            },
            audit: audits.map(toAudit),
            corrections: corrections.map(toCorrection),
          });
        });
      } catch {
        return err({ kind: "unavailable" });
      }
    },
  };
}
