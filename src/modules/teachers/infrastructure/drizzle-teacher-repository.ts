import { and, asc, eq, inArray } from "drizzle-orm";
import { teacher } from "~/platform/db/schema/teachers";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  TeacherFilter,
  TeacherRepository,
} from "../application/teacher-repository";
import type { Teacher } from "../application/teachers";
import { teacherNameKey, type TeacherModality } from "../domain/teacher-core";

type Row = typeof teacher.$inferSelect;

function toTeacher(row: Row): Teacher {
  return {
    id: row.id,
    name: row.name,
    bioLine: row.bioLine,
    phone: row.phone,
    email: row.email,
    modality: row.modality as TeacherModality,
    active: row.active,
    audit: { updatedBy: row.updatedBy, updatedAt: row.updatedAt },
  };
}

function toValues(value: Teacher) {
  return {
    name: value.name,
    nameKey: teacherNameKey(value.name),
    bioLine: value.bioLine,
    phone: value.phone,
    email: value.email,
    modality: value.modality,
    active: value.active,
    updatedBy: value.audit.updatedBy,
    updatedAt: value.audit.updatedAt,
  };
}

/** One short-lived session per call; database errors propagate to the caller. */
export function createDrizzleTeacherRepository(
  openSession: DbSessionFactory,
): TeacherRepository {
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
        await db.insert(teacher).values({ id: value.id, ...toValues(value) });
      }),

    update: (value) =>
      withSession(async (db) => {
        const rows = await db
          .update(teacher)
          .set(toValues(value))
          .where(eq(teacher.id, value.id))
          .returning({ id: teacher.id });
        return rows.length > 0;
      }),

    findById: (id) =>
      withSession(async (db) => {
        const rows = await db.select().from(teacher).where(eq(teacher.id, id));
        const row = rows[0];
        return row ? toTeacher(row) : null;
      }),

    findByIds: (ids) =>
      withSession(async (db) => {
        if (ids.length === 0) return new Map<string, Teacher>();
        const rows = await db
          .select()
          .from(teacher)
          .where(inArray(teacher.id, [...ids]));
        return new Map(rows.map((row) => [row.id, toTeacher(row)]));
      }),

    findActiveByName: (name) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(teacher)
          .where(
            and(
              eq(teacher.active, true),
              eq(teacher.nameKey, teacherNameKey(name)),
            ),
          );
        const row = rows[0];
        return row ? toTeacher(row) : null;
      }),

    list: (filter: TeacherFilter) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(teacher)
          .where(
            filter === "all"
              ? undefined
              : eq(teacher.active, filter === "active"),
          )
          .orderBy(asc(teacher.nameKey), asc(teacher.id));
        return rows.map(toTeacher);
      }),
  };
}
