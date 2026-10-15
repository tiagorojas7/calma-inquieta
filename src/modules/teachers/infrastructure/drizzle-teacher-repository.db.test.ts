import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  buildStoredTeacher,
  ID_A,
  ID_B,
  runTeacherRepositoryContract,
} from "~/testing/contracts/teacher-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleTeacherRepository } from "./drizzle-teacher-repository";

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
  return {
    database,
    openSession,
    repo: createDrizzleTeacherRepository(openSession),
  };
}

runTeacherRepositoryContract(async () => (await freshRepository()).repo);

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return "cause" in error ? sqlState(error.cause) : undefined;
}

describe("createDrizzleTeacherRepository", () => {
  it("has no percentage column", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ column_name: string }>(
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = 'teacher' ORDER BY column_name`,
      );
      expect(rows.map((row) => row.column_name)).toEqual([
        "active",
        "bio_line",
        "email",
        "id",
        "modality",
        "name",
        "name_key",
        "phone",
        "updated_at",
        "updated_by",
      ]);
    } finally {
      await session.close();
    }
  });

  it("reports an active-name collision with SQLSTATE 23505", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredTeacher());

    const failure = await repo
      .insert(buildStoredTeacher({ id: ID_B, name: "LUCÍA PÉREZ" }))
      .catch((e: unknown) => e);

    expect(sqlState(failure)).toBe("23505");
  });

  it("refuses an unknown modality with SQLSTATE 23514", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const failure = await session.db
        .execute(
          sql`INSERT INTO teacher (id, name, name_key, bio_line, modality, updated_by, updated_at)
              VALUES (${ID_A}, 'X', 'x', 'bio', 'propia', 'a@example.com', now())`,
        )
        .catch((e: unknown) => e);

      expect(sqlState(failure)).toBe("23514");
    } finally {
      await session.close();
    }
  });

  it("closes the session after every call", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const open = createDbSessionFactory({ connectionString: database.url });
    const state = { opened: 0, closed: 0 };
    const repo = createDrizzleTeacherRepository(async () => {
      const session = await open();
      state.opened += 1;
      return {
        db: session.db,
        close: () => {
          state.closed += 1;
          return session.close();
        },
      };
    });

    await repo.insert(buildStoredTeacher());
    await repo.update(buildStoredTeacher());
    await repo.findById(ID_A);
    await repo.findByIds([ID_A]);
    await repo.findByIds([]);
    await repo.findActiveByName("x");
    await repo.list("all");
    await repo.insert(buildStoredTeacher()).catch(() => undefined);

    expect(state.closed).toBe(state.opened);
    expect(state.opened).toBeGreaterThanOrEqual(7);
  });
});
