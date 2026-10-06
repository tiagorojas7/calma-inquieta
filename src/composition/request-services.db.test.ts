import { afterAll, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

// Creating a database is the slow part of these tests, so each test file keeps
// the number small: one shared migrated database plus one that a test drops.
const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function newDatabase() {
  const database = await createTestDatabase();
  created.push(database);
  return database;
}

describe("createRequestServices", () => {
  it("reports ok with the latest migration for a migrated database", async () => {
    const database = await newDatabase();
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc" },
      {},
      createIsolateState(),
    );

    const result = await services.getSystemStatus();

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "ok",
        latestMigration: "0000_baseline",
        buildCommit: "abc",
      },
    });
  });

  it("reports degraded when the database is unreachable", async () => {
    const services = createRequestServices(
      { databaseUrl: UNREACHABLE_URL, buildCommit: "abc" },
      {},
      createIsolateState(),
    );

    const result = await services.getSystemStatus();

    expect(result).toMatchObject({
      ok: true,
      value: { status: "degraded", latestMigration: null },
    });
  });

  it("serves later requests of an isolate from its memo, and only that isolate", async () => {
    const database = await newDatabase();
    const isolate = createIsolateState();
    const config = { databaseUrl: database.url, buildCommit: "abc" };
    const first = await createRequestServices(
      config,
      {},
      isolate,
    ).getSystemStatus();
    await database.drop();

    // A new request builds new services but shares the isolate state.
    const sameIsolate = await createRequestServices(
      config,
      {},
      isolate,
    ).getSystemStatus();
    // A new isolate has an empty memo, so it reaches the (now dropped) database.
    const freshIsolate = await createRequestServices(
      config,
      {},
      createIsolateState(),
    ).getSystemStatus();

    expect(first).toMatchObject({ ok: true, value: { status: "ok" } });
    expect(sameIsolate).toMatchObject({ ok: true, value: { status: "ok" } });
    expect(freshIsolate).toMatchObject({
      ok: true,
      value: { status: "degraded" },
    });
  });

  it("hands the connection teardown to the runtime when it provides defer", async () => {
    const database = await newDatabase();
    const deferred: Promise<unknown>[] = [];
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc" },
      {
        defer: (pending) => {
          deferred.push(pending);
        },
      },
      createIsolateState(),
    );

    await services.getSystemStatus();

    expect(deferred).toHaveLength(1);
    await Promise.all(deferred);
  });
});
