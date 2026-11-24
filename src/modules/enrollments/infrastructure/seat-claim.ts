import { and, eq, sql } from "drizzle-orm";
import { turnoSeatCounter } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/**
 * Claims one seat of a turno inside the caller's transaction. The counter row
 * is created on first use and the increment applies only while the capacity
 * has room; resolves false when the turno is full. Shared by every write that
 * confirms an order, so the conditional update lives in one place.
 */
export async function claimSeat(
  tx: Db,
  turno: {
    readonly periodId: string;
    readonly turnoId: string;
    readonly capacity: number;
  },
): Promise<boolean> {
  await tx
    .insert(turnoSeatCounter)
    .values({
      periodId: turno.periodId,
      turnoId: turno.turnoId,
      confirmedSeats: 0,
      capacity: turno.capacity,
    })
    .onConflictDoNothing();
  const claimed = await tx
    .update(turnoSeatCounter)
    .set({
      confirmedSeats: sql`${turnoSeatCounter.confirmedSeats} + 1`,
      capacity: turno.capacity,
    })
    .where(
      and(
        eq(turnoSeatCounter.periodId, turno.periodId),
        eq(turnoSeatCounter.turnoId, turno.turnoId),
        sql`${turnoSeatCounter.confirmedSeats} < ${turno.capacity}`,
      ),
    )
    .returning({ confirmedSeats: turnoSeatCounter.confirmedSeats });
  return claimed.length > 0;
}
