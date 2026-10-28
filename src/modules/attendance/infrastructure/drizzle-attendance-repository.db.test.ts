import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { runAttendanceRepositoryContract } from "~/testing/contracts/attendance-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleAttendanceRepository } from "./drizzle-attendance-repository";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function freshRepository() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  return { openSession, repo: createDrizzleAttendanceRepository(openSession) };
}

runAttendanceRepositoryContract(async () => (await freshRepository()).repo);

describe("createDrizzleAttendanceRepository", () => {
  it("has exactly the attendance tables and columns", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{
        table_name: string;
        column_name: string;
      }>(
        sql`SELECT table_name, column_name FROM information_schema.columns
            WHERE table_name IN ('attendance_mark', 'attendance_make_up')
            ORDER BY table_name, column_name`,
      );
      expect(rows.map((r) => `${r.table_name}.${r.column_name}`)).toEqual([
        "attendance_make_up.created_at",
        "attendance_make_up.created_by",
        "attendance_make_up.done_at",
        "attendance_make_up.done_by",
        "attendance_make_up.id",
        "attendance_make_up.make_up_date",
        "attendance_make_up.make_up_period_id",
        "attendance_make_up.make_up_turno_id",
        "attendance_make_up.period_id",
        "attendance_make_up.session_date",
        "attendance_make_up.status",
        "attendance_make_up.student_email",
        "attendance_make_up.student_name",
        "attendance_make_up.turno_id",
        "attendance_mark.marked_at",
        "attendance_mark.marked_by",
        "attendance_mark.period_id",
        "attendance_mark.session_date",
        "attendance_mark.status",
        "attendance_mark.student_email",
        "attendance_mark.turno_id",
      ]);
    } finally {
      await session.close();
    }
  });

  it("rejects an unknown mark status and an unnormalized email", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const insert = (email: string, status: string) =>
        session.db.execute(
          sql`INSERT INTO attendance_mark
              (period_id, turno_id, session_date, student_email, status, marked_by, marked_at)
              VALUES (gen_random_uuid(), gen_random_uuid(), '2026-10-05', ${email}, ${status}, 'o', now())`,
        );
      await expect(insert("ana@example.com", "late")).rejects.toThrow();
      await expect(insert(" Ana@example.com", "present")).rejects.toThrow();
    } finally {
      await session.close();
    }
  });
});
