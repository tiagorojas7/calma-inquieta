import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createMaterialsService } from "~/modules/materials";
import { createDrizzleOrderLineUsageLookup } from "~/modules/enrollments/infrastructure/drizzle-order-line-usage-lookup";
import { material, supplier } from "~/platform/db/schema/materials";
import { createDbSessionFactory } from "~/platform/db/session";
import { createTestDatabase } from "~/testing/db/test-database";
import type { TestDatabase } from "~/testing/db/test-database";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { createDrizzleMaterialRepository } from "./drizzle-material-repository";
import { createDrizzleSupplierRepository } from "./drizzle-supplier-repository";

const SUPPLIER_ID = "00000000-0000-4000-8000-000000000301";
const HEADER = "Categoría;Producto;Medida;Precio";
const actor = testAdminActor("owner@example.com");
const OCTOBER_CSV = readFileSync(
  new URL(
    "../../../../docs/materials/catalogo-octubre-2026.csv",
    import.meta.url,
  ),
  "utf8",
);
const created: TestDatabase[] = [];

afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function setup() {
  const database = await createTestDatabase();
  created.push(database);
  const open = createDbSessionFactory({ connectionString: database.url });
  const counter = { opened: 0, closed: 0 };
  const openSession: typeof open = async () => {
    const session = await open();
    counter.opened += 1;
    return {
      db: session.db,
      close: () => {
        counter.closed += 1;
        return session.close();
      },
    };
  };
  const seed = await open();
  try {
    await seed.db.insert(supplier).values({
      id: SUPPLIER_ID,
      name: "Casa Pincel",
      nameKey: "casa pincel",
      active: true,
      updatedBy: "owner@example.com",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  } finally {
    await seed.close();
  }
  const service = createMaterialsService({
    repository: createDrizzleMaterialRepository(
      openSession,
      createDrizzleOrderLineUsageLookup(openSession),
    ),
    suppliers: createDrizzleSupplierRepository(openSession),
    media: { findAssets: () => Promise.resolve(new Map()) },
    clock: advancingClock(new Date("2026-10-20T12:00:00.000Z")),
  });
  const count = async () => {
    const session = await open();
    try {
      const { rows } = await session.db.execute<{
        materials: string;
        variants: string;
        unpriced: string;
      }>(sql`SELECT
          (SELECT count(*) FROM material) AS materials,
          (SELECT count(*) FROM material_variant) AS variants,
          (SELECT count(*) FROM material_variant
             WHERE price_centavos IS NULL) AS unpriced`);
      const row = rows[0];
      return {
        materials: Number(row?.materials),
        variants: Number(row?.variants),
        unpriced: Number(row?.unpriced),
      };
    } finally {
      await session.close();
    }
  };
  return { service, counter, count, open };
}

describe("catalog import against PostgreSQL", () => {
  it("imports the whole October catalog with a constant number of sessions, and re-running is a no-op", async () => {
    const { service, counter, count } = await setup();

    const before = counter.opened;
    const first = await service.importCatalog(actor, SUPPLIER_ID, OCTOBER_CSV);
    expect(first).toMatchObject({
      ok: true,
      value: { newMaterials: 95, newVariants: 189 },
    });
    const sessionsForImport = counter.opened - before;
    expect(await count()).toEqual({
      materials: 95,
      variants: 189,
      unpriced: 4,
    });
    // supplier lookup, batched read (+ usage lookup), one write transaction.
    expect(sessionsForImport).toBeLessThanOrEqual(5);

    const again = await service.importCatalog(actor, SUPPLIER_ID, OCTOBER_CSV);
    expect(again).toMatchObject({
      ok: true,
      value: {
        newMaterials: 0,
        newVariants: 0,
        priceChanges: 0,
        unchanged: 189,
      },
    });
    expect(await count()).toEqual({
      materials: 95,
      variants: 189,
      unpriced: 4,
    });
    expect(counter.opened).toBe(counter.closed);
  });

  it("completes a partially imported catalog on re-import", async () => {
    const { service, count } = await setup();
    const lines = OCTOBER_CSV.trimEnd().split(/\r?\n/);
    const partial = [lines[0], ...lines.slice(1, 40)].join("\n");
    expect(
      await service.importCatalog(actor, SUPPLIER_ID, partial),
    ).toMatchObject({ ok: true });
    expect((await count()).materials).toBeLessThan(95);

    expect(
      await service.importCatalog(actor, SUPPLIER_ID, OCTOBER_CSV),
    ).toMatchObject({ ok: true });
    expect(await count()).toEqual({
      materials: 95,
      variants: 189,
      unpriced: 4,
    });
  });

  it("rolls back the whole import when a write in the middle fails", async () => {
    const { service, count, open } = await setup();
    await service.importCatalog(
      actor,
      SUPPLIER_ID,
      `${HEADER}\nTazas;Taza;Chica;1000\n`,
    );
    // A database trigger rejects one product mid-batch, like a failing row.
    const session = await open();
    try {
      await session.db.execute(sql`
        CREATE FUNCTION reject_vaso() RETURNS trigger AS $$
        BEGIN
          IF NEW.name = 'Vaso' THEN RAISE EXCEPTION 'boom'; END IF;
          RETURN NEW;
        END $$ LANGUAGE plpgsql`);
      await session.db.execute(sql`
        CREATE TRIGGER reject_vaso BEFORE INSERT ON ${material}
        FOR EACH ROW EXECUTE FUNCTION reject_vaso()`);
    } finally {
      await session.close();
    }

    await expect(
      service.importCatalog(
        actor,
        SUPPLIER_ID,
        `${HEADER}\nTazas;Plato;Hondo;500\nTazas;Taza;Grande;2000\nTazas;Vaso;Alto;300\nTazas;Jarra;Media;400\n`,
      ),
    ).rejects.toThrow();

    expect(await count()).toEqual({ materials: 1, variants: 1, unpriced: 0 });
  });

  it("applies a price raise to every material in one transaction", async () => {
    const { service, counter, count } = await setup();
    await service.importCatalog(actor, SUPPLIER_ID, OCTOBER_CSV);

    const before = counter.opened;
    const raised = await service.raisePrices(
      actor,
      { supplierId: SUPPLIER_ID },
      10,
    );
    expect(raised).toMatchObject({ ok: true });
    // one list (+ usage lookup) and one write transaction.
    expect(counter.opened - before).toBeLessThanOrEqual(3);
    expect(await count()).toEqual({
      materials: 95,
      variants: 189,
      unpriced: 4,
    });
  });
});
