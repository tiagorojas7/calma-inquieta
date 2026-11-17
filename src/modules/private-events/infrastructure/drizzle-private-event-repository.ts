import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { privateEventRequest } from "~/platform/db/schema/private-events";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  PrivateEventFilter,
  PrivateEventRepository,
  StoredPrivateEvent,
} from "../application/private-event-repository";
import { isPrivateEventStatus } from "../domain/private-event-core";

type Row = typeof privateEventRequest.$inferSelect;

function toStored(row: Row): StoredPrivateEvent {
  if (!isPrivateEventStatus(row.status))
    throw new Error(`Unknown private event status: ${row.status}`);
  return {
    id: row.id,
    status: row.status,
    fullName: row.fullName,
    phoneDigits: row.phoneDigits,
    email: row.email,
    desiredDate: row.desiredDate,
    place: row.place,
    participants: row.participants,
    notes: row.notes,
    createdAt: row.createdAt,
    statusChangedBy: row.statusChangedBy,
    statusChangedAt: row.statusChangedAt,
  };
}

/** One short-lived session per call. */
export function createDrizzlePrivateEventRepository(
  openSession: DbSessionFactory,
): PrivateEventRepository {
  async function withSession<T>(
    run: (db: Awaited<ReturnType<DbSessionFactory>>["db"]) => Promise<T>,
  ): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    insert: (value) =>
      withSession(async (db) => {
        await db.insert(privateEventRequest).values(value);
      }),

    findById: (id) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(privateEventRequest)
          .where(eq(privateEventRequest.id, id));
        const row = rows[0];
        return row ? toStored(row) : null;
      }),

    list: (filter: PrivateEventFilter) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(privateEventRequest)
          .where(
            filter === "all"
              ? undefined
              : eq(privateEventRequest.status, filter),
          )
          .orderBy(
            desc(privateEventRequest.createdAt),
            asc(privateEventRequest.id),
          );
        return rows.map(toStored);
      }),

    unseen: () =>
      withSession((db) =>
        db
          .select({
            id: privateEventRequest.id,
            fullName: privateEventRequest.fullName,
            desiredDate: privateEventRequest.desiredDate,
            createdAt: privateEventRequest.createdAt,
          })
          .from(privateEventRequest)
          .where(isNull(privateEventRequest.seenAt))
          .orderBy(
            desc(privateEventRequest.createdAt),
            asc(privateEventRequest.id),
          ),
      ),

    markSeen: (id, change) =>
      withSession(async (db) => {
        // One conditional update: the first opener stamps it, and a later or
        // concurrent opener never overwrites the mark.
        const marked = await db
          .update(privateEventRequest)
          .set({ seenAt: change.at, seenBy: change.by })
          .where(
            and(
              eq(privateEventRequest.id, id),
              isNull(privateEventRequest.seenAt),
            ),
          )
          .returning({ id: privateEventRequest.id });
        if (marked.length > 0) return "seen" as const;
        const known = await db
          .select({ id: privateEventRequest.id })
          .from(privateEventRequest)
          .where(eq(privateEventRequest.id, id));
        return known.length > 0 ? ("already-seen" as const) : null;
      }),

    setStatus: (id, status, change) =>
      withSession(async (db) => {
        const rows = await db
          .update(privateEventRequest)
          .set({
            status,
            statusChangedBy: change.by,
            statusChangedAt: change.at,
          })
          .where(eq(privateEventRequest.id, id))
          .returning();
        const row = rows[0];
        return row ? toStored(row) : null;
      }),
  };
}
