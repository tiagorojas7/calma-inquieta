import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  MaterialNameConflictError,
  type MaterialRepository,
} from "~/modules/materials";
import { createDbSessionFactory } from "~/platform/db/session";
import { supplier } from "~/platform/db/schema/materials";
import {
  buildStoredMaterial,
  buildStoredVariant,
  MATERIAL_ASSET_ID,
  MATERIAL_B,
  MATERIAL_SUPPLIER_ID,
  runMaterialRepositoryContract,
} from "~/testing/contracts/material-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleMaterialRepository } from "./drizzle-material-repository";

const SECOND_SUPPLIER_ID = "00000000-0000-4000-8000-000000000302";
const created: TestDatabase[] = [];
const unusedVariants = {
  findUsedVariantIds: (): Promise<ReadonlySet<string>> =>
    Promise.resolve(new Set()),
};

afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function seedParents(
  openSession: ReturnType<typeof createDbSessionFactory>,
) {
  const session = await openSession();
  try {
    await session.db.insert(supplier).values([
      {
        id: MATERIAL_SUPPLIER_ID,
        name: "Proveedor",
        nameKey: "proveedor",
        active: true,
        updatedBy: "owner@example.com",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: SECOND_SUPPLIER_ID,
        name: "Other",
        nameKey: "other",
        active: true,
        updatedBy: "owner@example.com",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    await session.db.execute(
      sql`INSERT INTO media_asset
            (id, storage_key, content_type, byte_size, width, height, created_by, created_at)
          VALUES
            (${MATERIAL_ASSET_ID}, 'material.jpg', 'image/jpeg', 100, 10, 10,
             'owner@example.com', ${new Date("2026-01-01T00:00:00.000Z")})`,
    );
  } finally {
    await session.close();
  }
}

async function freshRepository() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  await seedParents(openSession);
  return {
    database,
    openSession,
    repository: createDrizzleMaterialRepository(openSession, unusedVariants),
  };
}

runMaterialRepositoryContract(async () => ({
  repository: (await freshRepository()).repository,
}));

describe("createDrizzleMaterialRepository", () => {
  it("owns exactly the material and variant persistence columns", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{
        table_name: string;
        column_name: string;
      }>(sql`SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_name IN ('material', 'material_variant')
            ORDER BY table_name, column_name`);
      expect(rows).toEqual([
        { table_name: "material", column_name: "active" },
        { table_name: "material", column_name: "available" },
        { table_name: "material", column_name: "category" },
        { table_name: "material", column_name: "category_key" },
        { table_name: "material", column_name: "description" },
        { table_name: "material", column_name: "id" },
        { table_name: "material", column_name: "image_alt" },
        { table_name: "material", column_name: "image_asset_id" },
        { table_name: "material", column_name: "name" },
        { table_name: "material", column_name: "name_key" },
        { table_name: "material", column_name: "supplier_id" },
        { table_name: "material", column_name: "updated_at" },
        { table_name: "material", column_name: "updated_by" },
        { table_name: "material_variant", column_name: "available" },
        { table_name: "material_variant", column_name: "id" },
        { table_name: "material_variant", column_name: "label" },
        { table_name: "material_variant", column_name: "label_key" },
        { table_name: "material_variant", column_name: "material_id" },
        { table_name: "material_variant", column_name: "position" },
        { table_name: "material_variant", column_name: "price_centavos" },
        { table_name: "material_variant", column_name: "swatch" },
      ]);
    } finally {
      await session.close();
    }
  });

  it("enforces supplier and media foreign keys", async () => {
    const { repository } = await freshRepository();
    await expect(
      repository.insert(
        buildStoredMaterial({
          id: MATERIAL_B,
          supplier: {
            ...buildStoredMaterial().supplier,
            id: crypto.randomUUID(),
          },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      repository.insert(
        buildStoredMaterial({
          id: MATERIAL_B,
          image: {
            assetId: crypto.randomUUID(),
            alt: "Missing",
            asset: null,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("enforces image pairs, positive prices, and lowercase hex swatches", async () => {
    const { repository } = await freshRepository();
    await expect(
      repository.insert(
        buildStoredMaterial({
          image: { assetId: MATERIAL_ASSET_ID, alt: "", asset: null },
        }),
      ),
    ).rejects.toThrow();
    const negative = Money.fromCentavos(-1);
    if (!negative.ok) throw new Error("expected signed Money");
    await expect(
      repository.insert(
        buildStoredMaterial({
          variants: [buildStoredVariant({ price: negative.value })],
        }),
      ),
    ).rejects.toThrow();
    await expect(
      repository.insert(
        buildStoredMaterial({
          id: MATERIAL_B,
          variants: [buildStoredVariant({ swatch: "#AABBCC" })],
        }),
      ),
    ).rejects.toThrow();
  });

  it("hydrates historical usage through the injected lookup", async () => {
    const stored = buildStoredMaterial();
    const [firstVariant] = stored.variants;
    if (!firstVariant) throw new Error("expected stored material variant");
    const { openSession } = await freshRepository();
    const repository = createDrizzleMaterialRepository(openSession, {
      findUsedVariantIds: (variantIds) =>
        Promise.resolve(
          new Set(variantIds.filter((id) => id === firstVariant.id)),
        ),
    });
    await repository.insert(stored);

    expect(await repository.findById(stored.id)).toMatchObject({
      variants: [{ id: firstVariant.id, used: true }],
    });
  });

  it("keeps materials readable through their live archived supplier", async () => {
    const { openSession, repository } = await freshRepository();
    const stored = buildStoredMaterial();
    await repository.insert(stored);
    const session = await openSession();
    try {
      await session.db
        .update(supplier)
        .set({
          active: false,
          name: "Archived supplier",
          nameKey: "archived supplier",
        })
        .where(sql`${supplier.id} = ${MATERIAL_SUPPLIER_ID}`);
    } finally {
      await session.close();
    }

    expect(await repository.findById(stored.id)).toMatchObject({
      supplier: { name: "Archived supplier", active: false },
    });
  });

  it("runs against the migration chain that includes B9 period offers", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ table_name: string }>(
        sql`SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'period_material_offer'`,
      );
      expect(rows).toEqual([{ table_name: "period_material_offer" }]);
    } finally {
      await session.close();
    }
  });

  it("closes the session after every repository call", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const open = createDbSessionFactory({ connectionString: database.url });
    await seedParents(open);
    const state = { opened: 0, closed: 0 };
    const repository = createDrizzleMaterialRepository(async () => {
      const session = await open();
      state.opened += 1;
      return {
        db: session.db,
        close: () => {
          state.closed += 1;
          return session.close();
        },
      };
    }, unusedVariants);

    await repository.insert(buildStoredMaterial());
    await repository.update(buildStoredMaterial());
    await repository.findById(buildStoredMaterial().id);
    await repository.findActiveByName("Ámbar");
    await repository.findByIds([buildStoredMaterial().id]);
    await repository.list({ state: "all" });

    expect(state.closed).toBe(state.opened);
    expect(state.opened).toBe(6);
  });

  it("maps only known unique races to typed material conflicts", async () => {
    const { repository } = await freshRepository();
    await repository.insert(buildStoredMaterial());
    const asPort: MaterialRepository = repository;
    await expect(
      asPort.insert(buildStoredMaterial({ id: MATERIAL_B, name: "ÁMBAR" })),
    ).rejects.toBeInstanceOf(MaterialNameConflictError);
    await expect(
      asPort.insert(buildStoredMaterial({ name: "Other" })),
    ).rejects.not.toBeInstanceOf(MaterialNameConflictError);
  });
});
