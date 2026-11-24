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
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { Money } from "~/modules/_shared";
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
        latestMigration: "0019_project_description",
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

  it("stores a free manual enrollment paid with its seat, and refuses one on a full turno without storing it", async () => {
    const database = await newDatabase();
    const turno = seedTurno({ label: "Lunes" });
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      buildSeed({
        ...fullyPopulatedSeed(),
        talleres: [
          seedTaller({
            slug: "ceramica",
            teacherId: fullyPopulatedSeed().teachers[0]?.id ?? null,
            turnos: [turno],
            periods: [
              seedPeriod({
                period: "2099-01",
                capacities: [{ turnoId: turno.id, capacity: 1 }],
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
    const actor = testAdminActor();
    const manual = (n: number) => ({
      slug: "ceramica",
      period: "2099-01",
      turnoId: turno.id,
      student: {
        fullName: `Alumna ${String(n)}`,
        email: `alumna${String(n)}@example.com`,
        phone: `351 555-100${String(n)}`,
        policyAccepted: true,
        honeypot: "",
      },
      lines: [],
    });
    const free = Money.zero();

    const first = await services.enrollments.createPending(actor, manual(1), {
      fee: free,
    });
    const second = await services.enrollments.createPending(actor, manual(2), {
      fee: free,
    });

    expect(first).toMatchObject({ ok: true, value: { status: "paid" } });
    expect(second).toEqual({ ok: false, error: { kind: "turno-full" } });
    const listed = await services.enrollments.list(actor, { status: "paid" });
    expect(
      listed.ok && listed.value.items.map((item) => item.studentName),
    ).toEqual(["Alumna 1"]);
    const pending = await services.enrollments.list(actor, {});
    expect(pending.ok && pending.value.items).toEqual([]);
  });

  it("stores the document versions a public enrollment accepted, refuses an unpublished one, and keeps none on a manual order", async () => {
    const database = await newDatabase();
    const turno = seedTurno({ label: "Lunes" });
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      buildSeed({
        ...fullyPopulatedSeed(),
        talleres: [
          seedTaller({
            slug: "ceramica",
            teacherId: fullyPopulatedSeed().teachers[0]?.id ?? null,
            turnos: [turno],
            periods: [
              seedPeriod({
                period: "2099-01",
                capacities: [{ turnoId: turno.id, capacity: 5 }],
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
    const actor = testAdminActor();
    const enrollment = (
      n: number,
      acceptance?: { conditionsVersion: number; privacyVersion: number },
    ) => ({
      slug: "ceramica",
      period: "2099-01",
      turnoId: turno.id,
      student: {
        fullName: `Alumna ${String(n)}`,
        email: `alumna${String(n)}@example.com`,
        phone: `351 555-100${String(n)}`,
        policyAccepted: true,
        honeypot: "",
      },
      lines: [],
      ...(acceptance === undefined ? {} : { acceptance }),
    });

    const current = await services.policies.current();
    expect(current.ok && current.value.conditions.version).toBe(1);
    await services.policies.publish(actor, "conditions", "Condiciones nuevas.");

    const accepted = await services.publicEnrollments.requestEnrollment(
      enrollment(1, { conditionsVersion: 2, privacyVersion: 1 }),
    );
    const stale = await services.publicEnrollments.requestEnrollment(
      enrollment(2, { conditionsVersion: 9, privacyVersion: 1 }),
    );
    const missing = await services.publicEnrollments.requestEnrollment(
      enrollment(3),
    );
    const manual = await services.enrollments.createPending(
      actor,
      enrollment(4),
    );

    expect(accepted.ok).toBe(true);
    expect(stale).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "policy", code: "unknown-reference" }],
      },
    });
    expect(missing).toEqual({ ok: false, error: { kind: "unavailable" } });
    expect(manual.ok).toBe(true);
    const listed = await services.enrollments.list(actor, {});
    if (!listed.ok) throw new Error("no list");
    const byName = new Map(
      await Promise.all(
        listed.value.items.map(async (item) => {
          const detail = await services.enrollments.detail(actor, item.id);
          return [
            item.studentName,
            detail.ok ? detail.value.acceptance : "failed",
          ] as const;
        }),
      ),
    );
    // Only the two stored orders exist; the refused ones left nothing behind.
    expect([...byName.keys()].sort()).toEqual(["Alumna 1", "Alumna 4"]);
    expect(byName.get("Alumna 1")).toEqual({
      conditionsVersion: 2,
      privacyVersion: 1,
    });
    expect(byName.get("Alumna 4")).toBeUndefined();
  });

  it("counts new public requests on the bell, marks them read when opened, and keeps pending payments until paid", async () => {
    const database = await newDatabase();
    const turno = seedTurno({ label: "Lunes" });
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      buildSeed({
        ...fullyPopulatedSeed(),
        talleres: [
          seedTaller({
            slug: "ceramica",
            teacherId: fullyPopulatedSeed().teachers[0]?.id ?? null,
            turnos: [turno],
            periods: [
              seedPeriod({
                period: "2099-01",
                capacities: [{ turnoId: turno.id, capacity: 5 }],
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
    const actor = testAdminActor();
    const enrollment = (n: number) => ({
      slug: "ceramica",
      period: "2099-01",
      turnoId: turno.id,
      student: {
        fullName: `Alumna ${String(n)}`,
        email: `alumna${String(n)}@example.com`,
        phone: `351 555-100${String(n)}`,
        policyAccepted: true,
        honeypot: "",
      },
      lines: [],
      // The form showed version 1 of each document (seeded by the migration).
      acceptance: { conditionsVersion: 1, privacyVersion: 1 },
    });
    const asked = await services.publicEnrollments.requestEnrollment(
      enrollment(1),
    );
    const manual = await services.enrollments.createPending(
      actor,
      enrollment(2),
    );
    const event = await services.privateEvents.requestEvent({
      fullName: "Dora Ruiz",
      phone: "351 555 0101",
      email: "",
      desiredDate: "2099-12-05",
      place: "Casa",
      participants: "12",
      notes: "",
      honeypot: "",
    });
    expect([asked.ok, manual.ok, event.ok]).toEqual([true, true, true]);

    const view = await services.insights.notifications(actor);
    if (!view.ok) throw new Error("no notifications");
    // The public enrollment and the event are new; the manual one was made by an owner.
    expect(view.value.novelties.map((item) => item.name).sort()).toEqual([
      "Alumna 1",
      "Dora Ruiz",
    ]);
    expect(await services.insights.unseenCount(actor)).toEqual({
      ok: true,
      value: 2,
    });
    // Both enrollments still owe their fee, read or not.
    expect(view.value.pendingPayments.map((item) => item.name).sort()).toEqual([
      "Alumna 1",
      "Alumna 2",
    ]);

    const listed = await services.enrollments.list(actor, {});
    const publicOrder = listed.ok
      ? listed.value.items.find((item) => item.studentName === "Alumna 1")
      : undefined;
    if (!publicOrder) throw new Error("public order missing");
    expect(await services.enrollments.markSeen(actor, publicOrder.id)).toEqual({
      ok: true,
      value: { kind: "seen" },
    });
    expect(await services.insights.unseenCount(actor)).toEqual({
      ok: true,
      value: 1,
    });
    await services.privateEvents.markSeen(
      actor,
      view.value.novelties.find((item) => item.kind === "private-event")?.id ??
        "",
    );
    expect(await services.insights.unseenCount(actor)).toEqual({
      ok: true,
      value: 0,
    });
    const after = await services.insights.notifications(actor);
    expect(
      after.ok && after.value.pendingPayments.map((item) => item.name).sort(),
    ).toEqual(["Alumna 1", "Alumna 2"]);
  });

  it("stores catalog materials on a manual enrollment, and never on a public one", async () => {
    const database = await newDatabase();
    const turno = seedTurno({ label: "Lunes" });
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      buildSeed({
        ...fullyPopulatedSeed(),
        talleres: [
          seedTaller({
            slug: "ceramica",
            teacherId: fullyPopulatedSeed().teachers[0]?.id ?? null,
            turnos: [turno],
            periods: [
              seedPeriod({
                period: "2099-01",
                capacities: [{ turnoId: turno.id, capacity: 10 }],
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
    const actor = testAdminActor();
    const supplier = await services.suppliers.create(actor, {
      name: "Casa Pincel",
      phone: "",
      email: "",
      notes: "",
    });
    if (!supplier.ok) throw new Error("supplier fixture");
    const material = await services.materials.create(actor, {
      name: "Arcilla",
      description: "Arcilla blanca",
      category: "Arcillas",
      supplierId: supplier.value.id,
      available: true,
      image: null,
      variants: [
        { label: "1 kg", price: "4000", available: true, swatch: "" },
        {
          label: "5 kg",
          price: "",
          priceOnRequest: true,
          available: true,
          swatch: "",
        },
      ],
    });
    if (!material.ok) throw new Error("material fixture");
    const [priced, unpriced] = material.value.variants;
    if (!priced || !unpriced) throw new Error("variant fixture");
    const manual = (
      n: number,
      lines: readonly {
        materialId: string;
        variantId: string;
        quantity: number;
      }[],
    ) => ({
      slug: "ceramica",
      period: "2099-01",
      turnoId: turno.id,
      student: {
        fullName: `Alumna ${String(n)}`,
        email: `alumna${String(n)}@example.com`,
        phone: `351 555-200${String(n)}`,
        policyAccepted: true,
        honeypot: "",
      },
      lines,
    });
    const chosen = (quantity: number) => ({
      materialId: material.value.id,
      variantId: priced.id,
      quantity,
    });
    const pending = async () => {
      const listed = await services.enrollments.list(actor, {});
      return listed.ok ? listed.value.items.length : -1;
    };
    const fee = Money.fromCentavos(4_000_000);
    if (!fee.ok) throw new Error("fee fixture");

    const created = await services.enrollments.createPending(
      actor,
      manual(1, [chosen(2)]),
      { fee: fee.value },
    );
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    expect(created.value).toMatchObject({
      status: "pending_confirmation",
      lines: [
        {
          materialName: "Arcilla",
          variantLabel: "1 kg",
          quantity: 2,
        },
      ],
    });
    expect(created.value.materialsTotal.toCentavos()).toBe(800_000);
    expect(created.value.total.toCentavos()).toBe(4_800_000);
    const reread = await services.publicEnrollments.getOrderByPublicId(
      created.value.publicId,
    );
    expect(reread).toMatchObject({
      ok: true,
      value: { total: created.value.total },
    });

    const free = Money.zero();
    const freeWithMaterials = await services.enrollments.createPending(
      actor,
      manual(2, [chosen(1)]),
      { fee: free },
    );
    expect(freeWithMaterials).toMatchObject({
      ok: true,
      value: { status: "pending_confirmation" },
    });
    expect(
      freeWithMaterials.ok && freeWithMaterials.value.total.toCentavos(),
    ).toBe(400_000);
    expect(
      await services.enrollments.createPending(actor, manual(3, []), {
        fee: free,
      }),
    ).toMatchObject({ ok: true, value: { status: "paid" } });
    expect(await pending()).toBe(2);

    const refused = [
      [
        manual(4, [{ ...chosen(1), variantId: "unknown-variant" }]),
        "material-not-offered",
      ],
      [
        manual(5, [{ ...chosen(1), variantId: unpriced.id }]),
        "material-unavailable",
      ],
      [manual(6, [chosen(0)]), "invalid-quantity"],
      [manual(7, [chosen(1.5)]), "invalid-quantity"],
    ] as const;
    for (const [input, kind] of refused)
      expect(
        await services.enrollments.createPending(actor, input, {
          fee: fee.value,
        }),
      ).toMatchObject({ ok: false, error: { kind } });
    await services.materials.deactivate(actor, material.value.id);
    expect(
      await services.enrollments.createPending(actor, manual(8, [chosen(1)]), {
        fee: fee.value,
      }),
    ).toMatchObject({ ok: false, error: { kind: "material-unavailable" } });
    expect(
      await services.publicEnrollments.requestEnrollment({
        ...manual(9, [chosen(1)]),
        acceptance: { conditionsVersion: 1, privacyVersion: 1 },
      }),
    ).toMatchObject({ ok: false, error: { kind: "material-not-offered" } });
    expect(await pending()).toBe(2);
  });

  it("sells materials under a monthly record through the wired services, paying and voiding them without touching the month", async () => {
    const database = await newDatabase();
    const turno = seedTurno({ label: "Lunes" });
    await seedCatalog(
      createDbSessionFactory({ connectionString: database.url }),
      buildSeed({
        ...fullyPopulatedSeed(),
        talleres: [
          seedTaller({
            slug: "ceramica",
            teacherId: fullyPopulatedSeed().teachers[0]?.id ?? null,
            turnos: [turno],
            periods: [
              seedPeriod({
                period: "2099-01",
                capacities: [{ turnoId: turno.id, capacity: 10 }],
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
    const actor = testAdminActor();
    const supplier = await services.suppliers.create(actor, {
      name: "Casa Pincel",
      phone: "",
      email: "",
      notes: "",
    });
    if (!supplier.ok) throw new Error("supplier fixture");
    const material = await services.materials.create(actor, {
      name: "Arcilla",
      description: "Arcilla blanca",
      category: "Arcillas",
      supplierId: supplier.value.id,
      available: true,
      image: null,
      variants: [{ label: "1 kg", price: "4000", available: true, swatch: "" }],
    });
    if (!material.ok) throw new Error("material fixture");
    const variant = material.value.variants[0];
    if (!variant) throw new Error("variant fixture");
    const stocked = await services.materials.adjustStock(
      actor,
      material.value.id,
      variant.id,
      { delta: "5", reason: "test" },
    );
    expect(stocked).toEqual({ ok: true, value: { onHand: 5 } });
    const fee = Money.fromCentavos(5_800_000);
    if (!fee.ok) throw new Error("fee fixture");
    const monthly = await services.enrollments.createPending(
      actor,
      {
        slug: "ceramica",
        period: "2099-01",
        turnoId: turno.id,
        student: {
          fullName: "Alumna Uno",
          email: "alumna1@example.com",
          phone: "351 555-2001",
          policyAccepted: true,
          honeypot: "",
        },
        lines: [],
      },
      { fee: fee.value },
    );
    if (!monthly.ok) throw new Error(JSON.stringify(monthly.error));
    const listed = await services.enrollments.list(actor, {});
    const record = listed.ok ? listed.value.items[0] : undefined;
    if (!record) throw new Error("record fixture");

    const sale = await services.enrollments.createMaterialSale(actor, {
      orderId: record.id,
      lines: [
        { materialId: material.value.id, variantId: variant.id, quantity: 2 },
      ],
    });
    if (!sale.ok) throw new Error(JSON.stringify(sale.error));
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // The sale is pending, takes nothing yet and leaves the month as it was.
    expect(await services.variantStock.onHand([variant.id])).toEqual(
      new Map([[variant.id, 5]]),
    );
    const month = await services.enrollments.detail(actor, record.id);
    expect(month).toMatchObject({
      ok: true,
      value: {
        status: "pending_confirmation",
        sales: [{ id: sale.value.id, status: "pending_confirmation" }],
      },
    });
    if (month.ok) expect(month.value.total.toCentavos()).toBe(5_800_000);
    expect(
      await services.enrollments.confirmPayment(actor, {
        orderId: sale.value.id,
        amount: "8000",
        paidOn: today,
      }),
    ).toEqual({ ok: true, value: { kind: "confirmed" } });
    expect(await services.variantStock.onHand([variant.id])).toEqual(
      new Map([[variant.id, 3]]),
    );
    expect(
      await services.enrollments.cancel(actor, {
        orderId: sale.value.id,
        reason: "devuelto",
        refund: { amount: "8000", refundedOn: today },
      }),
    ).toEqual({ ok: true, value: { kind: "cancelled" } });
    expect(await services.variantStock.onHand([variant.id])).toEqual(
      new Map([[variant.id, 5]]),
    );
    const after = await services.enrollments.detail(actor, record.id);
    expect(after).toMatchObject({
      ok: true,
      value: {
        status: "pending_confirmation",
        sales: [{ id: sale.value.id, status: "cancelled" }],
      },
    });
    // A sale never takes the place of the monthly record in the month.
    expect(
      await services.enrollments.createPending(
        actor,
        {
          slug: "ceramica",
          period: "2099-01",
          turnoId: turno.id,
          student: {
            fullName: "Alumna Uno",
            email: "alumna1@example.com",
            phone: "351 555-2001",
            policyAccepted: true,
            honeypot: "",
          },
          lines: [],
        },
        { fee: fee.value },
      ),
    ).toMatchObject({ ok: false, error: { kind: "duplicate-order" } });
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
