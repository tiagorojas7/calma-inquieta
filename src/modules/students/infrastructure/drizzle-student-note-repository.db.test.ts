import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { studentNote } from "~/platform/db/schema/students";
import { runStudentNoteRepositoryContract } from "~/testing/contracts/student-note-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleStudentNoteRepository } from "./drizzle-student-note-repository";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function fresh() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  return {
    openSession,
    repository: createDrizzleStudentNoteRepository(openSession),
  };
}

runStudentNoteRepositoryContract(async () => (await fresh()).repository);

describe("student_note constraints", () => {
  const row = (email: string, note: string) => ({
    email,
    note,
    updatedBy: "owner@example.com",
    updatedAt: new Date("2026-10-30T15:00:00Z"),
  });

  it("rejects an email that is not normalized", async () => {
    const { openSession } = await fresh();
    const session = await openSession();
    try {
      await expect(
        session.db.insert(studentNote).values(row("Ana@Example.com", "x")),
      ).rejects.toThrow();
    } finally {
      await session.close();
    }
  });

  it("rejects a note longer than 2000 characters", async () => {
    const { openSession } = await fresh();
    const session = await openSession();
    try {
      await expect(
        session.db
          .insert(studentNote)
          .values(row("ana@example.com", "x".repeat(2001))),
      ).rejects.toThrow();
    } finally {
      await session.close();
    }
  });
});
