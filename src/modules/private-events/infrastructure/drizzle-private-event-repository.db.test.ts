import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { privateEventRequest } from "~/platform/db/schema/private-events";
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
        "seen_at",
        "seen_by",
        "status",
        "status_changed_at",
        "status_changed_by",
      ]);
    } finally {
      await session.close();
    }
  });

  it("stores a new request unseen and keeps the first opener's mark", async () => {
    const { openSession, repo } = await freshRepository();
    await repo.insert(buildStoredPrivateEvent());
    const first = {
      by: "agus@example.com",
      at: new Date("2026-10-25T09:30:00.000Z"),
    };
    const marks = async () => {
      const session = await openSession();
      try {
        return await session.db
          .select({
            seenAt: privateEventRequest.seenAt,
            seenBy: privateEventRequest.seenBy,
          })
          .from(privateEventRequest);
      } finally {
        await session.close();
      }
    };

    expect(await marks()).toEqual([{ seenAt: null, seenBy: null }]);
    await repo.markSeen(buildStoredPrivateEvent().id, first);
    await repo.markSeen(buildStoredPrivateEvent().id, {
      by: "caro@example.com",
      at: new Date("2026-10-26T09:30:00.000Z"),
    });

    expect(await marks()).toEqual([{ seenAt: first.at, seenBy: first.by }]);
  });

  it("lets exactly one of several concurrent openers set the mark", async () => {
    const { repo } = await freshRepository();
    const event = buildStoredPrivateEvent();
    await repo.insert(event);

    const outcomes = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        repo.markSeen(event.id, {
          by: `owner-${String(index)}@example.com`,
          at: new Date("2026-10-25T09:30:00.000Z"),
        }),
      ),
    );

    expect(outcomes.filter((outcome) => outcome === "seen")).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome === "already-seen"),
    ).toHaveLength(5);
  });

  it("refuses a half-set read mark at the database", async () => {
    const { openSession, repo } = await freshRepository();
    await repo.insert(buildStoredPrivateEvent());
    const session = await openSession();
    try {
      await expect(
        session.db.execute(
          sql`UPDATE private_event_request SET seen_by = 'someone'`,
        ),
      ).rejects.toThrow();
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
