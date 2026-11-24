import { sql } from "drizzle-orm";
import { orderNumberSequence } from "~/platform/db/schema/enrollments";
import type { DbSessionFactory } from "~/platform/db/session";
import { formatOrderNumber } from "../domain/order-core";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

/**
 * The next `CI-YYYY-NNNN` of the year, from the yearly sequence row, inside
 * the caller's transaction: a rollback gives the number back.
 */
export async function nextOrderNumber(tx: Db, year: number): Promise<string> {
  const sequence = await tx
    .insert(orderNumberSequence)
    .values({ year, last: 1 })
    .onConflictDoUpdate({
      target: orderNumberSequence.year,
      set: { last: sql`${orderNumberSequence.last} + 1` },
    })
    .returning({ last: orderNumberSequence.last });
  const last = sequence[0]?.last;
  if (last === undefined) throw new Error("order sequence unavailable");
  return formatOrderNumber(year, last);
}
