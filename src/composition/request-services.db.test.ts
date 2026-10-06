import { afterAll, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function newDatabase(options?: { empty?: boolean }) {
  const database = await createTestDatabase(options);
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

  it("serves a second call from the isolate memo without reconnecting", async () => {
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
    const second = await createRequestServices(
      config,
      {},
      isolate,
    ).getSystemStatus();

    expect(first).toMatchObject({ ok: true, value: { status: "ok" } });
    expect(second).toMatchObject({ ok: true, value: { status: "ok" } });
  });

  it("does not share the memo across isolates", async () => {
    const database = await newDatabase();
    const config = { databaseUrl: database.url, buildCommit: "abc" };
    await createRequestServices(
      config,
      {},
      createIsolateState(),
    ).getSystemStatus();
    await database.drop();

    const fresh = await createRequestServices(
      config,
      {},
      createIsolateState(),
    ).getSystemStatus();

    expect(fresh).toMatchObject({ ok: true, value: { status: "degraded" } });
  });

  it("hands the connection teardown to the runtime when it provides defer", async () => {
    const database = await newDatabase();
    const deferred: Promise<unknown>[] = [];
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc" },
      { defer: (pending) => deferred.push(pending) },
      createIsolateState(),
    );

    await services.getSystemStatus();

    expect(deferred).toHaveLength(1);
    await Promise.all(deferred);
  });
});
