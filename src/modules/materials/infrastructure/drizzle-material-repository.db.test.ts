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
  it("deletes only an unreferenced material and its zero stock row without removing the shared image", async () => {
    const { openSession, repository } = await freshRepository();
    const stored = buildStoredMaterial();
    await repository.insert(stored);
    const session = await openSession();
    try {
      await session.db.execute(
        sql`INSERT INTO variant_stock (variant_id, on_hand, updated_at, updated_by) VALUES (${stored.variants[0]?.id}, 0, now(), 'owner@example.com')`,
      );
    } finally {
      await session.close();
    }
    expect(await repository.deleteIfUnused(stored.id)).toBe("deleted");
    expect(await repository.findById(stored.id)).toBeNull();
    const check = await openSession();
    try {
      const stock = await check.db.execute(
        sql`SELECT * FROM variant_stock WHERE variant_id = ${stored.variants[0]?.id}`,
      );
      const media = await check.db.execute(
        sql`SELECT id FROM media_asset WHERE id = ${MATERIAL_ASSET_ID}`,
      );
      expect(stock.rows).toHaveLength(0);
      expect(media.rows).toHaveLength(1);
    } finally {
      await check.close();
    }
  });

  it("refuses deletion with on-hand units or a stock adjustment and leaves every row unchanged", async () => {
    const { openSession, repository } = await freshRepository();
    const stored = buildStoredMaterial();
    await repository.insert(stored);
    const variantId = stored.variants[0]?.id;
    const session = await openSession();
    try {
      await session.db.execute(
        sql`INSERT INTO variant_stock (variant_id, on_hand, updated_at, updated_by) VALUES (${variantId}, 2, now(), 'owner@example.com')`,
      );
    } finally {
      await session.close();
    }
    expect(await repository.deleteIfUnused(stored.id)).toBe("in-use");
    expect(await repository.findById(stored.id)).not.toBeNull();
    const reset = await openSession();
    try {
      await reset.db.execute(
        sql`UPDATE variant_stock SET on_hand = 0 WHERE variant_id = ${variantId}`,
      );
      await reset.db.execute(
        sql`INSERT INTO stock_adjustment (id, variant_id, delta, reason, at, by) VALUES (${crypto.randomUUID()}, ${variantId}, 2, 'Llegaron', now(), 'owner@example.com')`,
      );
    } finally {
      await reset.close();
    }
    expect(await repository.deleteIfUnused(stored.id)).toBe("in-use");
    expect(await repository.findById(stored.id)).not.toBeNull();
    const check = await openSession();
    try {
      expect(
        (
          await check.db.execute(
            sql`SELECT * FROM variant_stock WHERE variant_id = ${variantId}`,
          )
        ).rows,
      ).toHaveLength(1);
      expect(
        (
          await check.db.execute(
            sql`SELECT * FROM stock_adjustment WHERE variant_id = ${variantId}`,
          )
        ).rows,
      ).toHaveLength(1);
    } finally {
      await check.close();
    }
  });

  it("refuses each historical sale, offer, project bill and request line until all are removed", async () => {
    const { openSession, repository } = await freshRepository();
    const stored = buildStoredMaterial();
    await repository.insert(stored);
    const variantId = stored.variants[0]?.id;
    if (!variantId) throw new Error("expected variant");
    const teacherId = crypto.randomUUID();
    const workshopId = crypto.randomUUID();
    const periodId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const intensiveId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const session = await openSession();
    try {
      await session.db
        .execute(sql`INSERT INTO teacher (id, name, name_key, bio_line, modality, active, updated_by, updated_at)
        VALUES (${teacherId}, 'Teacher', 'teacher', '', 'own', true, 'seed', now())`);
      await session.db.execute(sql`INSERT INTO monthly_workshop
        (id, slug, name, summary, description, technique, default_fee_centavos, status, updated_by, updated_at)
        VALUES (${workshopId}, 'deletion-fixture', 'Workshop', '', '', '', 10000, 'draft', 'seed', now())`);
      await session.db.execute(sql`INSERT INTO workshop_period
        (id, workshop_id, period, fee_centavos, materials_required,
         snapshot_teacher_id, snapshot_teacher_name, snapshot_teacher_modality,
         status, opened_by, opened_at, updated_by, updated_at)
        VALUES (${periodId}, ${workshopId}, '2026-11', 10000, true,
          ${teacherId}, 'Teacher', 'own', 'draft', 'seed', now(), 'seed', now())`);
      await session.db
        .execute(sql`INSERT INTO period_material_offer (period_id, material_id, position)
        VALUES (${periodId}, ${stored.id}, 0)`);
      await session.db
        .execute(sql`INSERT INTO student (id, full_name, email, phone_digits, created_at, updated_at)
        VALUES (${studentId}, 'Ana Perez', 'delete@example.com', '5493515551234', now(), now())`);
      await session.db.execute(sql`INSERT INTO enrollment_order
        (id, student_id, public_id, number, status, source, workshop_id, period_id, period,
         turno_id, workshop_name, turno_label, weekday, starts_at, ends_at,
         student_name, student_email, student_phone_digits, fee_centavos,
         materials_centavos, total_centavos, policy_version, requested_at)
        VALUES (${orderId}, ${studentId}, 'delete-order', 'DEL-1', 'pending_confirmation',
          'public', ${workshopId}, ${periodId}, '2026-11', ${crypto.randomUUID()},
          'Workshop', 'Morning', 1, '10:00', '12:00', 'Ana Perez',
          'delete@example.com', '5493515551234', 10000, 0, 10000, 'v1', now())`);
      await session.db.execute(sql`INSERT INTO order_line
        (order_id, position, material_id, variant_id, material_name, variant_label,
         unit_price_centavos, quantity, supplier_id, supplier_name)
        VALUES (${orderId}, 0, ${stored.id}, ${variantId}, 'Ámbar', 'Única',
          10000, 1, ${MATERIAL_SUPPLIER_ID}, 'Proveedor')`);
      await session.db.execute(sql`INSERT INTO intensive_workshop
        (id, slug, name, summary, description, event_date, starts_at, ends_at,
         price_centavos, deposit_centavos, capacity, min_seats, policy_text,
         materials_included, status, updated_by, updated_at)
        VALUES (${intensiveId}, 'deletion-intensive', 'Intensive', '', '', '2026-11-20',
          '10:00', '12:00', 10000, 5000, 10, 1, 'Policy', false, 'draft', 'seed', now())`);
      await session.db.execute(sql`INSERT INTO intensive_project
        (id, intensive_id, position, name, price_centavos, deposit_centavos, updated_by, updated_at)
        VALUES (${projectId}, ${intensiveId}, 0, 'Project', 10000, 5000, 'seed', now())`);
      await session.db.execute(sql`INSERT INTO intensive_project_material
        (project_id, position, variant_id, quantity)
        VALUES (${projectId}, 0, ${variantId}, 1)`);
      await session.db.execute(sql`INSERT INTO intensive_seat_request
        (id, public_id, intensive_id, status, full_name, email, phone_digits,
         policy_accepted_at, created_at)
        VALUES (${requestId}, 'delete-request', ${intensiveId}, 'pending_confirmation',
          'Ana Perez', 'delete-request@example.com', '5493515551234', now(), now())`);
      await session.db.execute(sql`INSERT INTO intensive_request_material
        (request_id, position, variant_id, material_name, variant_label,
         supplier_id, supplier_name, quantity, source)
        VALUES (${requestId}, 0, ${variantId}, 'Ámbar', 'Única',
          ${MATERIAL_SUPPLIER_ID}, 'Proveedor', 1, 'supplier')`);
    } finally {
      await session.close();
    }

    const removeOne = async (query: ReturnType<typeof sql>) => {
      expect(await repository.deleteIfUnused(stored.id)).toBe("in-use");
      expect(await repository.findById(stored.id)).not.toBeNull();
      const connection = await openSession();
      try {
        await connection.db.execute(query);
      } finally {
        await connection.close();
      }
    };
    await removeOne(
      sql`DELETE FROM period_material_offer WHERE period_id = ${periodId}`,
    );
    await removeOne(sql`DELETE FROM order_line WHERE order_id = ${orderId}`);
    await removeOne(
      sql`DELETE FROM intensive_project_material WHERE project_id = ${projectId}`,
    );
    await removeOne(
      sql`DELETE FROM intensive_request_material WHERE request_id = ${requestId}`,
    );
    expect(await repository.deleteIfUnused(stored.id)).toBe("deleted");
  });
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
        { table_name: "material", column_name: "kept_in_studio" },
        { table_name: "material", column_name: "name" },
        { table_name: "material", column_name: "name_key" },
        { table_name: "material", column_name: "supplier_id" },
        { table_name: "material", column_name: "updated_at" },
        { table_name: "material", column_name: "updated_by" },
        { table_name: "material_variant", column_name: "available" },
        { table_name: "material_variant", column_name: "cost_centavos" },
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

  it("enforces image pairs, positive prices and costs, and lowercase hex swatches", async () => {
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
          variants: [buildStoredVariant({ cost: negative.value })],
        }),
      ),
    ).rejects.toThrow();
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
