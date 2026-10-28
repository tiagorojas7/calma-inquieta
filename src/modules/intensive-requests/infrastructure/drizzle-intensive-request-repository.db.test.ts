import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  buildStoredRequest,
  runIntensiveRequestRepositoryContract,
} from "~/testing/contracts/intensive-request-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleIntensiveRequestRepository } from "./drizzle-intensive-request-repository";

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
    repo: createDrizzleIntensiveRequestRepository(openSession),
  };
}

runIntensiveRequestRepositoryContract(
  async () => (await freshRepository()).repo,
);

describe("createDrizzleIntensiveRequestRepository", () => {
  it("has exactly the seat request columns", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ column_name: string }>(
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = 'intensive_seat_request' ORDER BY column_name`,
      );
      expect(rows.map((row) => row.column_name)).toEqual([
        "cancel_reason",
        "cancelled_at",
        "cancelled_by",
        "confirmed_at",
        "confirmed_by",
        "created_at",
        "email",
        "full_name",
        "id",
        "intensive_id",
        "paid_centavos",
        "paid_on",
        "payment_note",
        "phone_digits",
        "policy_accepted_at",
        "public_id",
        "status",
      ]);
    } finally {
      await session.close();
    }
  });

  it("refuses an unknown status and a confirmed row without a deposit at the database", async () => {
    const { repo } = await freshRepository();

    await expect(
      repo.insert(buildStoredRequest({ status: "otra" as never })),
    ).rejects.toThrow();
    await expect(
      repo.insert(buildStoredRequest({ status: "confirmed" })),
    ).rejects.toThrow();
  });

  it("rejects a duplicate public id instead of reporting a duplicate request", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredRequest());

    await expect(
      repo.insert(
        buildStoredRequest({
          id: "3a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04",
          email: "otra@example.com",
        }),
      ),
    ).rejects.toThrow();
  });
});
