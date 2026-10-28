import { and, asc, eq, ne, sql } from "drizzle-orm";
import { err, ok, Money } from "~/modules/_shared";
import { intensiveSeatRequest } from "~/platform/db/schema/intensive-requests";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  CancelInput,
  ConfirmInput,
  IntensiveRequestRepository,
  RequestFilter,
  StoredIntensiveRequest,
} from "../application/intensive-request-repository";
import { isIntensiveRequestStatus } from "../domain/intensive-request-core";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
type Row = typeof intensiveSeatRequest.$inferSelect;

type ConfirmResult = Awaited<ReturnType<IntensiveRequestRepository["confirm"]>>;
type CancelResult = Awaited<ReturnType<IntensiveRequestRepository["cancel"]>>;

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
    createdAt: row.createdAt,
    paidAmount: row.paidCentavos === null ? null : toMoney(row.paidCentavos),
    paidOn: row.paidOn,
    paymentNote: row.paymentNote,
    confirmedBy: row.confirmedBy,
    confirmedAt: row.confirmedAt,
    cancelReason: row.cancelReason,
    cancelledBy: row.cancelledBy,
    cancelledAt: row.cancelledAt,
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

/** One short-lived session per call. */
export function createDrizzleIntensiveRequestRepository(
  openSession: DbSessionFactory,
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
    insert: (request) =>
      withSession(async (db) => {
        try {
          await db.insert(intensiveSeatRequest).values({
            id: request.id,
            publicId: request.publicId,
            intensiveId: request.intensiveId,
            status: request.status,
            fullName: request.fullName,
            email: request.email,
            phoneDigits: request.phoneDigits,
            policyAcceptedAt: request.policyAcceptedAt,
            createdAt: request.createdAt,
            paidCentavos: request.paidAmount?.toCentavos() ?? null,
            paidOn: request.paidOn,
            paymentNote: request.paymentNote,
            confirmedBy: request.confirmedBy,
            confirmedAt: request.confirmedAt,
            cancelReason: request.cancelReason,
            cancelledBy: request.cancelledBy,
            cancelledAt: request.cancelledAt,
          });
          return ok(undefined);
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
          if (row) return ok(toStored(row));
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

    cancel: (input: CancelInput) =>
      withSession(async (db): Promise<CancelResult> => {
        const updated = await db
          .update(intensiveSeatRequest)
          .set({
            status: "cancelled",
            cancelReason: input.reason,
            cancelledBy: input.by,
            cancelledAt: input.at,
          })
          .where(
            and(
              eq(intensiveSeatRequest.id, input.id),
              ne(intensiveSeatRequest.status, "cancelled"),
            ),
          )
          .returning();
        const row = updated[0];
        if (row) return ok(toStored(row));
        const existing = await byId(db, input.id);
        return existing
          ? err({ kind: "illegal-transition", from: "cancelled" })
          : err({ kind: "not-found" });
      }),
  };
}
