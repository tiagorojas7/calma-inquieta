import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { err, Money, ok, type NotFound, type Result } from "~/modules/_shared";
import type { DbSessionFactory } from "~/platform/db/session";
import {
  enrollmentOrder,
  orderAudit,
  orderLine,
  student,
} from "~/platform/db/schema/enrollments";
import {
  transition,
  type IllegalTransition,
  type LineSource,
  type OrderStatus,
} from "../domain/order-core";
import type {
  AuditEntry,
  OrderRepository,
  StoredOrder,
} from "../application/enrollment-repository";
import type { OrderStockPort } from "../application/order-stock";
import { nextOrderNumber } from "./order-number";
import { takeStockLines } from "./order-stock-lines";
import { claimSeat } from "./seat-claim";

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

/** Thrown inside the create transaction to roll everything back when the turno is full. */
class TurnoFullRollback extends Error {}

/**
 * Short-lived PostgreSQL sessions with atomic order creation and transitions.
 * An order created already paid takes its stock lines in the same transaction.
 */
export function createDrizzleOrderRepository(
  openSession: DbSessionFactory,
  stock: OrderStockPort<Db>,
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
        const paid = draft.paidOnCreation;
        try {
          return await db.transaction(async (tx) => {
            const identityKeys = [
              `email:${draft.student.email}`,
              `phone:${draft.student.phoneDigits}`,
            ].sort();
            for (const identityKey of identityKeys) {
              await tx.execute(
                sql`select pg_advisory_xact_lock(hashtextextended(${identityKey}, 0))`,
              );
            }
            const matchedStudents = await tx
              .select()
              .from(student)
              .where(
                or(
                  eq(student.email, draft.student.email),
                  eq(student.phoneDigits, draft.student.phoneDigits),
                ),
              )
              .for("update");
            const emailStudent =
              matchedStudents.find(
                (candidate) => candidate.email === draft.student.email,
              ) ?? null;
            const phoneStudent =
              matchedStudents.find(
                (candidate) =>
                  candidate.phoneDigits === draft.student.phoneDigits,
              ) ?? null;
            if (
              emailStudent !== null &&
              phoneStudent !== null &&
              emailStudent.id !== phoneStudent.id
            )
              return err({ kind: "duplicate-order" as const });
            const matchedStudent = emailStudent ?? phoneStudent;
            const studentId = matchedStudent?.id ?? crypto.randomUUID();
            if (matchedStudent === null) {
              await tx.insert(student).values({
                id: studentId,
                fullName: draft.student.fullName,
                email: draft.student.email,
                phoneDigits: draft.student.phoneDigits,
                createdAt: draft.requestedAt,
                updatedAt: draft.requestedAt,
              });
            } else {
              await tx
                .update(student)
                .set({
                  fullName: draft.student.fullName,
                  email: draft.student.email,
                  phoneDigits: draft.student.phoneDigits,
                  // A new enrollment brings an inactive profile back.
                  active: true,
                  updatedAt: draft.requestedAt,
                })
                .where(eq(student.id, studentId));
            }
            const number = await nextOrderNumber(tx, draft.year);
            const id = crypto.randomUUID();
            await tx.insert(enrollmentOrder).values({
              id,
              studentId,
              publicId: draft.publicId,
              number,
              status: paid ? "paid" : "pending_confirmation",
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
              ...(draft.acceptance === undefined
                ? {}
                : {
                    conditionsVersion: draft.acceptance.conditionsVersion,
                    privacyVersion: draft.acceptance.privacyVersion,
                  }),
              requestedAt: draft.requestedAt,
              // A request an admin created is read by its creator; a public one is new.
              ...(draft.createdBy === undefined
                ? {}
                : { seenAt: draft.requestedAt, seenBy: draft.createdBy }),
              ...(paid
                ? {
                    paidAt: paid.paidAt,
                    paidAmountCentavos: draft.total.toCentavos(),
                    confirmedBy: paid.confirmedBy,
                  }
                : {}),
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
                  source: line.source,
                  unitCostCentavos: line.unitCost?.toCentavos() ?? null,
                })),
              );
            }
            // Last writes before the audit row: a full turno rolls back the
            // student, the number, the order and the stock with it.
            if (
              paid &&
              !(await claimSeat(tx, {
                periodId: draft.periodId,
                turnoId: draft.turnoId,
                capacity: paid.capacity,
              }))
            )
              throw new TurnoFullRollback();
            if (paid)
              await takeStockLines(tx, stock, id, {
                by: paid.confirmedBy,
                at: paid.paidAt,
              });
            await tx.insert(orderAudit).values({
              id: crypto.randomUUID(),
              orderId: id,
              at: draft.requestedAt,
              actor: paid?.confirmedBy ?? draft.createdBy ?? "public",
              from: null,
              to: paid ? "paid" : "pending_confirmation",
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
          if (error instanceof TurnoFullRollback)
            return err({ kind: "turno-full" as const });
          if (
            hasConstraint(
              error,
              "enrollment_order_student_period_active_unique",
            ) ||
            hasConstraint(error, "student_email_unique") ||
            hasConstraint(error, "student_phone_digits_unique")
          )
            return err({ kind: "duplicate-order" });
          throw error;
        }
      }),

    // A sale is never reachable by a public link: the public page is the monthly record's.
    findByPublicId: (publicId) =>
      withSession(async (db) => {
        const values = await loadOrders(
          db,
          and(
            eq(enrollmentOrder.publicId, publicId),
            eq(enrollmentOrder.kind, "enrollment"),
          ),
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
              .select({
                count: sql<number>`count(*)::int`,
                fromSupplier: sql<number>`(count(*) filter (where ${orderLine.source} = 'supplier'))::int`,
              })
              .from(orderLine)
              .where(eq(orderLine.orderId, orderId));
            const moved = transition(current.status as OrderStatus, to, {
              hasMaterialLines: (lineCount[0]?.count ?? 0) > 0,
              hasSupplierLines: (lineCount[0]?.fromSupplier ?? 0) > 0,
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
                      ...(context.refund
                        ? {
                            refundedAmountCentavos:
                              context.refund.amount.toCentavos(),
                            refundedAt: context.refund.refundedAt,
                            refundNote: context.refund.note ?? null,
                            refundedBy: context.actor,
                          }
                        : {}),
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
                  ...(to === "cancelled" && context.refund
                    ? {
                        refundedAmountCentavos:
                          context.refund.amount.toCentavos(),
                        refundedAt: context.refund.refundedAt,
                        refundNote: context.refund.note ?? null,
                        refundedBy: context.actor,
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
