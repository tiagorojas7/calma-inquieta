import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  buildStoredPrivateEvent,
  runPrivateEventRepositoryContract,
} from "~/testing/contracts/private-event-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzlePrivateEventRepository } from "./drizzle-private-event-repository";

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
    openSession,
    repo: createDrizzlePrivateEventRepository(openSession),
  };
}

runPrivateEventRepositoryContract(async () => (await freshRepository()).repo);

describe("createDrizzlePrivateEventRepository", () => {
  it("has exactly the private event request columns", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ column_name: string }>(
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = 'private_event_request' ORDER BY column_name`,
      );
      expect(rows.map((row) => row.column_name)).toEqual([
        "created_at",
        "desired_date",
        "email",
        "full_name",
        "id",
        "notes",
        "participants",
        "phone_digits",
        "place",
        "status",
        "status_changed_at",
        "status_changed_by",
      ]);
    } finally {
      await session.close();
    }
  });

  it("refuses an unknown status and out-of-range participants at the database", async () => {
    const { repo } = await freshRepository();

    await expect(
      repo.insert(buildStoredPrivateEvent({ status: "otra" as never })),
    ).rejects.toThrow();
    await expect(
      repo.insert(buildStoredPrivateEvent({ participants: 201 })),
    ).rejects.toThrow();
  });
});
