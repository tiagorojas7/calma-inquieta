import { afterAll, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { seedCatalog } from "~/testing/db/seed-catalog";
import {
  buildSeed,
  fullyPopulatedSeed,
  seedIntensivo,
  seedPeriod,
  seedTaller,
  seedTurno,
  SEED_ASSET_ID,
} from "~/testing/fakes/catalog-seed";
import { createDbSessionFactory } from "~/platform/db/session";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";
const SITE = {
  siteUrl: "https://calma.example.test",
  indexingEnabled: false,
  mediaBucket: null,
};

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
        latestMigration: "0017_material_price_on_request",
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
        mediaBucket: null,
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

  it("does not hide an unreachable database behind an empty talleres list", async () => {
    const services = createRequestServices(
      { databaseUrl: UNREACHABLE_URL, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    await expect(services.publicCatalog.talleres.list()).rejects.toThrow();
    await expect(
      services.publicCatalog.talleres.findBySlug("ceramica"),
    ).rejects.toThrow();
  });

  it("does not hide an unreachable database behind an empty intensivos list", async () => {
    const services = createRequestServices(
      { databaseUrl: UNREACHABLE_URL, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    await expect(services.publicCatalog.intensivos.list()).rejects.toThrow();
    await expect(
      services.publicCatalog.intensivos.findBySlug("intensivo-demo"),
    ).rejects.toThrow();
  });

  it("serves an empty public catalog on a migrated empty database", async () => {
    const database = await newDatabase();
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    expect(await services.publicCatalog.talleres.list()).toEqual([]);
    expect(await services.publicCatalog.intensivos.list({ limit: 3 })).toEqual(
      [],
    );
    expect(
      await services.publicCatalog.intensivos.findBySlug("nada"),
    ).toBeNull();
    expect(await services.publicCatalog.intensivos.listSlugs()).toEqual([]);
  });

  it("returns a seeded visible intensivo through the wired reader", async () => {
    const database = await newDatabase();
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      buildSeed({
        ...fullyPopulatedSeed(),
        intensivos: [
          ...fullyPopulatedSeed().intensivos,
          seedIntensivo({ slug: "pasado", eventDate: "2020-01-01" }),
        ].map((row) =>
          row.slug === "intensivo-demo"
            ? { ...row, eventDate: "2099-01-01" }
            : row,
        ),
      }),
    );
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    const listed = await services.publicCatalog.intensivos.list();

    expect(listed.map((item) => item.slug)).toEqual(["intensivo-demo"]);
    expect(listed[0]?.date).toBe("2099-01-01");
    expect(listed[0]?.teacher?.name).toBe("Lucía Demo");
    // The real media lookup is wired: the stored photo resolves.
    expect(listed[0]?.images.map((image) => image.alt)).toEqual([
      "Manos en el torno",
    ]);
    expect(
      (await services.publicCatalog.intensivos.findBySlug("intensivo-demo"))
        ?.slug,
    ).toBe("intensivo-demo");
    expect(await services.publicCatalog.intensivos.listSlugs()).toEqual([
      "intensivo-demo",
    ]);
  });

  it("returns a seeded visible taller through the wired reader", async () => {
    const database = await newDatabase();
    const turno = seedTurno({ label: "Lunes" });
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      buildSeed({
        ...fullyPopulatedSeed(),
        talleres: [
          ...fullyPopulatedSeed().talleres.filter(
            (row) => row.status === "draft",
          ),
          seedTaller({
            slug: "ceramica",
            teacherId: fullyPopulatedSeed().teachers[0]?.id ?? null,
            images: [{ assetId: SEED_ASSET_ID, alt: "Mesa de trabajo" }],
            turnos: [turno],
            periods: [
              seedPeriod({
                period: "2099-01",
                projectTitle: "Taza",
                capacities: [{ turnoId: turno.id, capacity: 8 }],
              }),
            ],
          }),
        ],
      }),
    );
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    const listed = await services.publicCatalog.talleres.list();

    expect(listed.map((item) => item.slug)).toEqual(["ceramica"]);
    expect(listed[0]?.teacher?.name).toBe("Lucía Demo");
    expect(listed[0]?.offering?.period).toBe("2099-01");
    expect(listed[0]?.turnos.map((t) => t.seats.capacity)).toEqual([8]);
    expect(listed[0]?.project?.title).toBe("Taza");
    expect(listed[0]?.images.map((image) => image.alt)).toEqual([
      "Mesa de trabajo",
    ]);
    expect(
      (await services.publicCatalog.talleres.findBySlug("ceramica"))?.slug,
    ).toBe("ceramica");
    expect(
      await services.publicCatalog.talleres.findBySlug("borrador"),
    ).toBeNull();
    expect(await services.publicCatalog.talleres.listSlugs()).toEqual([
      "ceramica",
    ]);
  });

  it("lets the admin save a taller with an uploaded photo", async () => {
    const database = await newDatabase();
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      fullyPopulatedSeed(),
    );
    const services = createRequestServices(
      { databaseUrl: database.url, buildCommit: "abc", ...SITE },
      {},
      createIsolateState(),
    );

    const created = await services.monthlyWorkshops.create(
      { kind: "admin-actor", email: "owner@example.test" },
      {
        name: "Telar",
        slug: "telar",
        summary: "Tejido en telar.",
        description: "Tejido en telar de bajo lizo.",
        technique: "Telar",
        defaultFee: "30000",
        teacherId: "",
        percentage: "",
        images: [{ assetId: SEED_ASSET_ID, alt: "Telar en uso" }],
        confirmSlugChange: false,
      },
    );

    expect(created.ok).toBe(true);
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
