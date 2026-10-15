import { afterAll, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";
const SITE = { siteUrl: "https://calma.example.test", indexingEnabled: false };

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
      { databaseUrl: database.url, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    const result = await services.getSystemStatus();

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "ok",
        latestMigration: "0002_teachers",
        buildCommit: "abc",
      },
    });
  });

  it("reports degraded when the database is unreachable", async () => {
    const services = createRequestServices(
      { databaseUrl: UNREACHABLE_URL, buildCommit: "abc", ...SITE },
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
    const config = { databaseUrl: database.url, buildCommit: "abc", ...SITE };
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
      { databaseUrl: database.url, buildCommit: "abc", ...SITE },
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

  it("builds the site content reader and the site config from the runtime config", async () => {
    const services = createRequestServices(
      {
        databaseUrl: UNREACHABLE_URL,
        buildCommit: "abc",
        siteUrl: "https://calma.example.workers.dev",
        indexingEnabled: true,
      },
      {},
      createIsolateState(),
    );

    const profile = await services.siteContent.getBusinessProfile();

    expect(services.site).toEqual({
      baseUrl: "https://calma.example.workers.dev",
      indexingEnabled: true,
    });
    expect(profile.address.street).toBe("Albert Sabin 6079");
    expect(profile.instagram.handle).toBe("calma.inquieta");
  });

  it("exposes an empty public catalog that reads without touching the database", async () => {
    const services = createRequestServices(
      { databaseUrl: UNREACHABLE_URL, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    const { talleres, intensivos } = services.publicCatalog;

    expect(await talleres.list()).toEqual([]);
    expect(await talleres.findBySlug("ceramica")).toBeNull();
    expect(await talleres.listSlugs()).toEqual([]);
    expect(await intensivos.list({ limit: 3 })).toEqual([]);
    expect(await intensivos.findBySlug("intensivo-demo")).toBeNull();
    expect(await intensivos.listSlugs()).toEqual([]);
  });

  it("serves the empty public catalog on a migrated empty database", async () => {
    const database = await newDatabase();
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    expect(await services.publicCatalog.talleres.list()).toEqual([]);
    expect(await services.publicCatalog.intensivos.listSlugs()).toEqual([]);
  });

  it("shares one content reader across requests of the same isolate", () => {
    const config = {
      databaseUrl: UNREACHABLE_URL,
      buildCommit: "abc",
      ...SITE,
    };
    const first = createRequestServices(config, {}, createIsolateState());
    const second = createRequestServices(config, {}, createIsolateState());

    expect(first.siteContent).toBe(second.siteContent);
    expect(first.site.indexingEnabled).toBe(false);
  });

  it("creates a plain Access key cache for each isolate", () => {
    const first = createIsolateState();
    first.accessKeys.keys.set("old-key", { kty: "RSA", n: "n", e: "AQAB" });

    const second = createIsolateState();

    expect(first.accessKeys.keys.get("old-key")).toEqual({
      kty: "RSA",
      n: "n",
      e: "AQAB",
    });
    expect(second.accessKeys.keys).toEqual(new Map());
    expect(second.accessKeys.fetchedAtMs).toBeNull();
  });
});
