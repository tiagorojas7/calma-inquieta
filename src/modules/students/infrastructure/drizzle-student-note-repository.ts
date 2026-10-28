import { eq } from "drizzle-orm";
import { studentNote } from "~/platform/db/schema/students";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  StudentNote,
  StudentNoteRepository,
} from "../application/student-ports";

/** One short-lived session per call; database errors propagate to the caller. */
export function createDrizzleStudentNoteRepository(
  openSession: DbSessionFactory,
): StudentNoteRepository {
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
    find: (email) =>
      withSession(async (db) => {
        const [row] = await db
          .select()
          .from(studentNote)
          .where(eq(studentNote.email, email));
        return row
          ? {
              email: row.email,
              text: row.note,
              updatedBy: row.updatedBy,
              updatedAt: row.updatedAt,
            }
          : null;
      }),
    save: (note: StudentNote) =>
      withSession(async (db) => {
        const values = {
          note: note.text,
          updatedBy: note.updatedBy,
          updatedAt: note.updatedAt,
        };
        await db
          .insert(studentNote)
          .values({ email: note.email, ...values })
          .onConflictDoUpdate({ target: studentNote.email, set: values });
      }),
  };
}
