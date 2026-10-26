import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { err, Money, ok, type Result } from "~/modules/_shared";
import type { DbSessionFactory } from "~/platform/db/session";
import {
  enrollmentOrder,
  orderAudit,
  orderLine,
  turnoSeatCounter,
} from "~/platform/db/schema/enrollments";
import {
  cancelOutcome,
  checkPaymentAmount,
  confirmOutcome,
  transition,
  type OrderStatus,
} from "../domain/order-core";
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
} from "../application/admin-enrollment-store";
import type {
  AuditEntry,
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
 * update the order, and append the audit row last in that transaction.
 */
export function createDrizzleAdminEnrollmentStore(
  openSession: DbSessionFactory,
  periods: AdminEnrollmentPeriodLookup,
): AdminEnrollmentStore {
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
            const period = await periods.find(order.periodId, order.turnoId);
            if (!period) return err({ kind: "period-closed" });
            const open = periodAcceptsOrders(
              { status: period.status, period: order.period },
              input.now,
            );
            if (!open.ok) return open;

            await tx
              .insert(turnoSeatCounter)
              .values({
                periodId: order.periodId,
                turnoId: order.turnoId,
                confirmedSeats: 0,
                capacity: period.capacity,
              })
              .onConflictDoNothing();
            const claimed = await tx
              .update(turnoSeatCounter)
              .set({
                confirmedSeats: sql`${turnoSeatCounter.confirmedSeats} + 1`,
                capacity: period.capacity,
              })
              .where(
                and(
                  eq(turnoSeatCounter.periodId, order.periodId),
                  eq(turnoSeatCounter.turnoId, order.turnoId),
                  sql`${turnoSeatCounter.confirmedSeats} < ${period.capacity}`,
                ),
              )
              .returning({ confirmedSeats: turnoSeatCounter.confirmedSeats });
            if (claimed.length === 0) return err({ kind: "turno-full" });

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
            if (outcome === "illegal")
              return err({
                kind: "illegal-transition",
                from: order.status as OrderStatus,
                to: "cancelled",
              });

            if (outcome === "cancel-release") {
              const released = await tx
                .update(turnoSeatCounter)
                .set({
                  confirmedSeats: sql`${turnoSeatCounter.confirmedSeats} - 1`,
                })
                .where(
                  and(
                    eq(turnoSeatCounter.periodId, order.periodId),
                    eq(turnoSeatCounter.turnoId, order.turnoId),
                    sql`${turnoSeatCounter.confirmedSeats} > 0`,
                  ),
                )
                .returning({ confirmedSeats: turnoSeatCounter.confirmedSeats });
              if (released.length === 0)
                throw new Error("seat counter unavailable");
            }

            await tx
              .update(enrollmentOrder)
              .set({
                status: "cancelled",
                cancelledAt: input.now,
                cancelReason: input.reason,
                cancelledBy: input.actor.email,
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
              .select({ count: sql<number>`count(*)::int` })
              .from(orderLine)
              .where(eq(orderLine.orderId, order.id));
            const moved = transition(order.status as OrderStatus, input.to, {
              hasMaterialLines: (lines[0]?.count ?? 0) > 0,
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
        workshopName: row.workshopName,
        period: row.period,
        turnoLabel: row.turnoLabel,
        status: row.status as OrderStatus,
        total: money(row.totalCentavos),
        requestedOn: cordobaDate(row.requestedAt),
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
          return ok({
            ...stored,
            email: stored.student.email,
            phoneDigits: stored.student.phoneDigits,
            seat: {
              confirmed: counter[0]?.confirmed ?? 0,
              capacity: period.capacity,
            },
            audit: audits.map(toAudit),
          });
        });
      } catch {
        return err({ kind: "unavailable" });
      }
    },
  };
}
