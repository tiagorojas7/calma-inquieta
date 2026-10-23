import { and, eq, sql } from "drizzle-orm";
import { err, ok } from "~/modules/_shared";
import { turnoSeatCounter } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import type { SeatLedger } from "../application/seat-ledger";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/** PostgreSQL-backed seat counter with one short-lived session per operation. */
export function createDrizzleSeatLedger(
  openSession: DbSessionFactory,
): SeatLedger {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    confirmedSeats: (periodId, turnoId) =>
      withSession(async (db) => {
        const rows = await db
          .select({ confirmedSeats: turnoSeatCounter.confirmedSeats })
          .from(turnoSeatCounter)
          .where(
            and(
              eq(turnoSeatCounter.periodId, periodId),
              eq(turnoSeatCounter.turnoId, turnoId),
            ),
          );
        return rows[0]?.confirmedSeats ?? 0;
      }),

    claim: (periodId, turnoId, capacity) =>
      withSession(async (db) => {
        const claimed = await db
          .insert(turnoSeatCounter)
          .values({ periodId, turnoId, confirmedSeats: 1, capacity })
          .onConflictDoUpdate({
            target: [turnoSeatCounter.periodId, turnoSeatCounter.turnoId],
            set: {
              confirmedSeats: sql`${turnoSeatCounter.confirmedSeats} + 1`,
              capacity,
            },
            setWhere: sql`${turnoSeatCounter.confirmedSeats} < ${capacity}`,
          })
          .returning({ confirmedSeats: turnoSeatCounter.confirmedSeats });
        return claimed.length ? ok(undefined) : err({ kind: "turno-full" });
      }),

    release: (periodId, turnoId) =>
      withSession(async (db) => {
        await db
          .update(turnoSeatCounter)
          .set({
            confirmedSeats: sql`GREATEST(${turnoSeatCounter.confirmedSeats} - 1, 0)`,
          })
          .where(
            and(
              eq(turnoSeatCounter.periodId, periodId),
              eq(turnoSeatCounter.turnoId, turnoId),
            ),
          );
      }),
  };
}
