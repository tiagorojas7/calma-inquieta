import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";
import { createDbSessionFactory } from "./session";

describe("DbSession against a real database", () => {
  const database = createTestDatabase();
  afterAll(async () => {
    await (await database).drop();
  });

  it("runs a query through drizzle", async () => {
    const { url } = await database;
    const session = await createDbSessionFactory({ connectionString: url })();

    const result = await session.db.execute<{ one: number }>(
      sql`SELECT 1 AS one`,
    );

    expect(result.rows).toEqual([{ one: 1 }]);
    await session.close();
  });

  it("closes idempotently", async () => {
    const { url } = await database;
    const session = await createDbSessionFactory({ connectionString: url })();

    await session.close();

    await expect(session.close()).resolves.toBeUndefined();
    await expect(session.db.execute(sql`SELECT 1`)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("hands the end promise to defer instead of awaiting it", async () => {
    const { url } = await database;
    const defer = vi.fn<(pending: Promise<unknown>) => void>();
    const session = await createDbSessionFactory({
      connectionString: url,
      defer,
    })();

    await session.close();
    await session.close();

    expect(defer).toHaveBeenCalledTimes(1);
    const pending = defer.mock.calls[0]?.[0];
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).resolves.toBeUndefined();
  });
});
