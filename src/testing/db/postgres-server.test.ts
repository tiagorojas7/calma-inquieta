import pg from "pg";
import { describe, expect, it } from "vitest";
import { startPostgresServer } from "./postgres-server";

async function canQuery(url: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    const { rows } = await client.query<{ one: number }>("SELECT 1 AS one");
    return rows[0]?.one === 1;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

describe("startPostgresServer", () => {
  it("returns TEST_DATABASE_URL untouched and stop is a no-op", async () => {
    const url = "postgres://admin:pw@127.0.0.1:1/override";

    const server = await startPostgresServer({ TEST_DATABASE_URL: url });

    expect(server.adminUrl).toBe(url);
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it("rejects an invalid TEST_DATABASE_URL naming only the variable", async () => {
    const secret = "secret-token-123";

    const failure = await startPostgresServer({
      TEST_DATABASE_URL: secret,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("TEST_DATABASE_URL");
    expect((failure as Error).message).not.toContain(secret);
  });

  it(
    "starts an isolated embedded server on a free port per call",
    { timeout: 120_000 },
    async () => {
      const [first, second] = await Promise.all([
        startPostgresServer({}),
        startPostgresServer({}),
      ]);
      try {
        expect(new URL(first.adminUrl).port).not.toBe(
          new URL(second.adminUrl).port,
        );
        await expect(canQuery(first.adminUrl)).resolves.toBe(true);
        await expect(canQuery(second.adminUrl)).resolves.toBe(true);
      } finally {
        await Promise.all([first.stop(), second.stop()]);
      }

      await expect(canQuery(first.adminUrl)).resolves.toBe(false);
    },
  );
});
