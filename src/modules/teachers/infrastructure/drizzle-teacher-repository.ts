import { and, eq, inArray } from "drizzle-orm";
import { err, ok } from "~/modules/_shared";
import { teacher } from "~/platform/db/schema/teachers";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  NameConflict,
  TeacherFilter,
  TeacherRepository,
} from "../application/teacher-repository";
import type { Teacher } from "../application/teachers";
import {
  compareTeachersByName,
  teacherNameKey,
  type TeacherModality,
} from "../domain/teacher-core";

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

const ACTIVE_NAME_INDEX = "teacher_active_name_unique";

/** True for a unique violation (23505) on the active-name index, cause chain included. */
function isActiveNameConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if (
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === ACTIVE_NAME_INDEX
  )
    return true;
  return "cause" in error && isActiveNameConflict(error.cause);
}

const nameConflict = err<NameConflict>({ kind: "name-conflict" });

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
        try {
          await db.insert(teacher).values({ id: value.id, ...toValues(value) });
        } catch (error) {
          if (isActiveNameConflict(error)) return nameConflict;
          throw error;
        }
        return ok(undefined);
      }),

    update: (value) =>
      withSession(async (db) => {
        try {
          const rows = await db
            .update(teacher)
            .set(toValues(value))
            .where(eq(teacher.id, value.id))
            .returning({ id: teacher.id });
          return rows.length > 0 ? ok(undefined) : err({ kind: "not-found" });
        } catch (error) {
          if (isActiveNameConflict(error)) return nameConflict;
          throw error;
        }
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
          );
        return rows.map(toTeacher).sort(compareTeachersByName);
      }),
  };
}
