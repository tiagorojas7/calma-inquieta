import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { err, ok, Money } from "~/modules/_shared";
import { intensiveSeatRequest } from "~/platform/db/schema/intensive-requests";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  BalanceInput,
  CancelInput,
  ConfirmInput,
  IntensiveRequestRepository,
  RequestFilter,
  RequestStockPort,
  StoredIntensiveRequest,
} from "../application/intensive-request-repository";
import {
  checkRefund,
  isIntensiveRequestStatus,
} from "../domain/intensive-request-core";
import {
  allocateProjectMaterials,
  returnRequestStock,
} from "./request-material-lines";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
type Row = typeof intensiveSeatRequest.$inferSelect;

type ConfirmResult = Awaited<ReturnType<IntensiveRequestRepository["confirm"]>>;
type InsertResult = Awaited<ReturnType<IntensiveRequestRepository["insert"]>>;
type CancelResult = Awaited<ReturnType<IntensiveRequestRepository["cancel"]>>;
type BalanceResult = Awaited<
  ReturnType<IntensiveRequestRepository["recordBalance"]>
>;

const LIVE_EMAIL_INDEX = "intensive_seat_request_live_email_unique";

function toMoney(centavos: number): Money {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error(`invalid stored amount ${String(centavos)}`);
  return money.value;
}

function toStored(row: Row): StoredIntensiveRequest {
  if (!isIntensiveRequestStatus(row.status))
    throw new Error(`Unknown intensive request status: ${row.status}`);
  return {
    id: row.id,
    publicId: row.publicId,
    intensiveId: row.intensiveId,
    status: row.status,
    fullName: row.fullName,
    email: row.email,
    phoneDigits: row.phoneDigits,
    policyAcceptedAt: row.policyAcceptedAt,
    ...(row.conditionsVersion === null || row.privacyVersion === null
      ? {}
      : {
          acceptance: {
            conditionsVersion: row.conditionsVersion,
            privacyVersion: row.privacyVersion,
          },
        }),
    createdAt: row.createdAt,
    paidAmount: row.paidCentavos === null ? null : toMoney(row.paidCentavos),
    paidOn: row.paidOn,
    paymentNote: row.paymentNote,
    confirmedBy: row.confirmedBy,
    confirmedAt: row.confirmedAt,
    cancelReason: row.cancelReason,
    cancelledBy: row.cancelledBy,
    cancelledAt: row.cancelledAt,
    projectId: row.projectId,
    price: row.priceCentavos === null ? null : toMoney(row.priceCentavos),
    deposit: row.depositCentavos === null ? null : toMoney(row.depositCentavos),
    // The columns are all or nothing (CHECK), so the amount decides.
    balance:
      row.balanceCentavos === null ||
      row.balancePaidOn === null ||
      row.balanceBy === null ||
      row.balanceAt === null
        ? null
        : {
            amount: toMoney(row.balanceCentavos),
            paidOn: row.balancePaidOn,
            note: row.balanceNote,
            by: row.balanceBy,
            at: row.balanceAt,
          },
    refund:
      row.refundCentavos === null || row.refundedOn === null
        ? null
        : {
            amount: toMoney(row.refundCentavos),
            refundedOn: row.refundedOn,
            note: row.refundNote,
          },
  };
}

function isLiveEmailConflict(error: unknown): boolean {
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
    if (candidate.code === "23505" && candidate.constraint === LIVE_EMAIL_INDEX)
      return true;
    current = candidate.cause;
  }
  return false;
}

/**
 * One short-lived session per call. `stock` is the port confirm and cancel
 * move the project materials through, inside their own transaction.
 */
export function createDrizzleIntensiveRequestRepository(
  openSession: DbSessionFactory,
  stock: RequestStockPort<Db>,
): IntensiveRequestRepository {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  const byId = async (db: Db, id: string) => {
    const [row] = await db
      .select()
      .from(intensiveSeatRequest)
      .where(eq(intensiveSeatRequest.id, id));
    return row ?? null;
  };

  return {
    markSeenForIntensive: (intensiveId, change) =>
      withSession(async (db) => {
        // One conditional update: an earlier mark, or a concurrent opener, is
        // never overwritten.
        const marked = await db
          .update(intensiveSeatRequest)
          .set({ seenAt: change.at, seenBy: change.by })
          .where(
            and(
              eq(intensiveSeatRequest.intensiveId, intensiveId),
              isNull(intensiveSeatRequest.seenAt),
            ),
          )
          .returning({ id: intensiveSeatRequest.id });
        return marked.length;
      }),

    insert: (request) =>
      withSession(async (db) => {
        try {
          return await db.transaction(async (tx): Promise<InsertResult> => {
            if (request.projectId !== null) {
              // Share lock on the project row: `deleteProject` locks it
              // `FOR UPDATE`, so the project cannot vanish until this request
              // is written, and one deleted before is not found here. The
              // table belongs to the workshops module, so its schema is not
              // imported: only these two columns are read.
              const project = await tx.execute(
                sql`SELECT 1 FROM intensive_project
                    WHERE id = ${request.projectId}
                      AND intensive_id = ${request.intensiveId}
                    FOR SHARE`,
              );
              if (project.rows.length === 0)
                return err({ kind: "unknown-project" as const });
            }
            await tx.insert(intensiveSeatRequest).values({
              id: request.id,
              publicId: request.publicId,
              intensiveId: request.intensiveId,
              status: request.status,
              fullName: request.fullName,
              email: request.email,
              phoneDigits: request.phoneDigits,
              policyAcceptedAt: request.policyAcceptedAt,
              conditionsVersion: request.acceptance?.conditionsVersion ?? null,
              privacyVersion: request.acceptance?.privacyVersion ?? null,
              createdAt: request.createdAt,
              paidCentavos: request.paidAmount?.toCentavos() ?? null,
              paidOn: request.paidOn,
              paymentNote: request.paymentNote,
              confirmedBy: request.confirmedBy,
              confirmedAt: request.confirmedAt,
              cancelReason: request.cancelReason,
              cancelledBy: request.cancelledBy,
              cancelledAt: request.cancelledAt,
              projectId: request.projectId,
              priceCentavos: request.price?.toCentavos() ?? null,
              depositCentavos: request.deposit?.toCentavos() ?? null,
              balanceCentavos: request.balance?.amount.toCentavos() ?? null,
              balancePaidOn: request.balance?.paidOn ?? null,
              balanceNote: request.balance?.note ?? null,
              balanceBy: request.balance?.by ?? null,
              balanceAt: request.balance?.at ?? null,
              refundCentavos: request.refund?.amount.toCentavos() ?? null,
              refundedOn: request.refund?.refundedOn ?? null,
              refundNote: request.refund?.note ?? null,
            });
            return ok(undefined);
          });
        } catch (error) {
          if (isLiveEmailConflict(error))
            return err({ kind: "duplicate-request" as const });
          throw error;
        }
      }),

    findById: (id) =>
      withSession(async (db) => {
        const row = await byId(db, id);
        return row ? toStored(row) : null;
      }),

    findByPublicId: (publicId) =>
      withSession(async (db) => {
        const [row] = await db
          .select()
          .from(intensiveSeatRequest)
          .where(eq(intensiveSeatRequest.publicId, publicId));
        return row ? toStored(row) : null;
      }),

    listByIntensive: (intensiveId, filter: RequestFilter) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(intensiveSeatRequest)
          .where(
            and(
              eq(intensiveSeatRequest.intensiveId, intensiveId),
              filter === "all"
                ? undefined
                : eq(intensiveSeatRequest.status, filter),
            ),
          )
          .orderBy(
            asc(intensiveSeatRequest.createdAt),
            asc(intensiveSeatRequest.id),
          );
        return rows.map(toStored);
      }),

    listOwed: (email) =>
      withSession(async (db) => {
        // The same rule the panel bell uses: a pending request owes its deposit
        // (the quoted one, or the workshop's for a request made before projects
        // existed); a confirmed one owes the balance while its price is above
        // its deposit and none is recorded. The workshop is joined as SQL: its
        // table belongs to the workshops module.
        const { rows } = await db.execute<{
          id: string;
          intensive_id: string;
          email: string;
          kind: "deposit" | "balance";
          amount: string;
        }>(sql`
          SELECT request.id, request.intensive_id,
                 lower(btrim(request.email)) AS email,
                 CASE WHEN request.status = 'pending_confirmation'
                      THEN 'deposit' ELSE 'balance' END AS kind,
                 CASE WHEN request.status = 'pending_confirmation'
                      THEN coalesce(request.deposit_centavos, workshop.deposit_centavos, 0)
                      ELSE request.price_centavos - request.deposit_centavos END AS amount
          FROM ${intensiveSeatRequest} AS request
          LEFT JOIN intensive_workshop AS workshop
            ON workshop.id = request.intensive_id
          WHERE (request.status = 'pending_confirmation'
             OR (request.status = 'confirmed'
                 AND request.balance_centavos IS NULL
                 AND request.price_centavos IS NOT NULL
                 AND request.deposit_centavos IS NOT NULL
                 AND request.price_centavos > request.deposit_centavos))
            ${email === undefined ? sql`` : sql`AND lower(btrim(request.email)) = ${email}`}
          ORDER BY request.created_at ASC, request.id ASC`);
        return rows
          .filter((row) => Number(row.amount) > 0)
          .map((row) => ({
            requestId: row.id,
            intensiveId: row.intensive_id,
            email: row.email,
            kind: row.kind,
            amount: toMoney(Number(row.amount)),
          }));
      }),

    confirmedSeats: (intensiveId) =>
      withSession(async (db) => {
        const [row] = await db
          .select({ taken: sql<number>`count(*)::int` })
          .from(intensiveSeatRequest)
          .where(
            and(
              eq(intensiveSeatRequest.intensiveId, intensiveId),
              eq(intensiveSeatRequest.status, "confirmed"),
            ),
          );
        return row?.taken ?? 0;
      }),

    confirm: (input: ConfirmInput) =>
      withSession((db) =>
        db.transaction(async (tx): Promise<ConfirmResult> => {
          const current = await byId(tx, input.id);
          if (!current) return err({ kind: "not-found" as const });
          // Serializes confirmations of one intensivo: the capacity check and
          // the update below see every earlier confirmation.
          await tx.execute(
            sql`SELECT pg_advisory_xact_lock(hashtextextended(${current.intensiveId}, 0))`,
          );
          const updated = await tx
            .update(intensiveSeatRequest)
            .set({
              status: "confirmed",
              paidCentavos: input.amount.toCentavos(),
              paidOn: input.paidOn,
              paymentNote: input.note,
              confirmedBy: input.by,
              confirmedAt: input.at,
            })
            .where(
              and(
                eq(intensiveSeatRequest.id, input.id),
                eq(intensiveSeatRequest.status, "pending_confirmation"),
                sql`(SELECT count(*) FROM intensive_seat_request AS taken
                     WHERE taken.intensive_id = ${current.intensiveId}
                       AND taken.status = 'confirmed') < ${input.capacity}`,
              ),
            )
            .returning();
          const row = updated[0];
          if (row) {
            // Same transaction as the seat: the units come out of the stock
            // exactly when the request takes its place, or neither happens.
            if (row.projectId !== null)
              await allocateProjectMaterials(tx, stock, row.id, row.projectId, {
                by: input.by,
                at: input.at,
              });
            return ok(toStored(row));
          }
          const latest = await byId(tx, input.id);
          if (!latest) return err({ kind: "not-found" as const });
          if (latest.status !== "pending_confirmation")
            return err({
              kind: "illegal-transition" as const,
              from: toStored(latest).status,
            });
          return err({ kind: "intensive-full" as const });
        }),
      ),

    recordBalance: (input: BalanceInput) =>
      withSession((db) =>
        db.transaction(async (tx): Promise<BalanceResult> => {
          const [current] = await tx
            .select()
            .from(intensiveSeatRequest)
            .where(eq(intensiveSeatRequest.id, input.id))
            .for("update");
          if (!current) return err({ kind: "not-found" as const });
          const stored = toStored(current);
          if (stored.status !== "confirmed")
            return err({
              kind: "illegal-transition" as const,
              from: stored.status,
            });
          if (stored.balance !== null)
            return err({ kind: "balance-already-paid" as const });
          const [row] = await tx
            .update(intensiveSeatRequest)
            .set({
              balanceCentavos: input.amount.toCentavos(),
              balancePaidOn: input.paidOn,
              balanceNote: input.note,
              balanceBy: input.by,
              balanceAt: input.at,
            })
            .where(eq(intensiveSeatRequest.id, input.id))
            .returning();
          if (!row) throw new Error("balance update lost its row");
          return ok(toStored(row));
        }),
      ),

    cancel: (input: CancelInput) =>
      withSession((db) =>
        db.transaction(async (tx): Promise<CancelResult> => {
          // The row lock makes a repeated or concurrent cancel see the result
          // of the first, so the units go back to the stock exactly once.
          const [current] = await tx
            .select()
            .from(intensiveSeatRequest)
            .where(eq(intensiveSeatRequest.id, input.id))
            .for("update");
          if (!current) return err({ kind: "not-found" as const });
          const stored = toStored(current);
          if (stored.status === "cancelled")
            return err({
              kind: "illegal-transition" as const,
              from: "cancelled" as const,
            });
          const refund = checkRefund(
            {
              status: stored.status,
              deposit: stored.paidAmount,
              depositPaidOn: stored.paidOn,
              balance: stored.balance?.amount ?? null,
              balancePaidOn: stored.balance?.paidOn ?? null,
            },
            input.refund,
            input.today,
          );
          if (!refund.ok) return refund;
          const [row] = await tx
            .update(intensiveSeatRequest)
            .set({
              status: "cancelled",
              cancelReason: input.reason,
              cancelledBy: input.by,
              cancelledAt: input.at,
              refundCentavos: input.refund?.amount.toCentavos() ?? null,
              refundedOn: input.refund?.refundedOn ?? null,
              refundNote: input.refund?.note ?? null,
            })
            .where(eq(intensiveSeatRequest.id, input.id))
            .returning();
          if (!row) throw new Error("cancel update lost its row");
          if (stored.status === "confirmed")
            await returnRequestStock(tx, stock, input.id, {
              by: input.by,
              at: input.at,
            });
          return ok(toStored(row));
        }),
      ),
  };
}
