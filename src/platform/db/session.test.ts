import { describe, expect, it } from "vitest";
import { createDbSessionFactory } from "./session";

describe("createDbSessionFactory", () => {
  it("rejects fast when the database is unreachable", async () => {
    const openSession = createDbSessionFactory({
      connectionString: "postgres://postgres@127.0.0.1:1/none",
      connectTimeoutMs: 500,
    });
    const startedAt = Date.now();

    await expect(openSession()).rejects.toBeInstanceOf(Error);

    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });
});
