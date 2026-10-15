import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  createSuppliersService,
  SupplierNameConflictError,
  type SupplierRepository,
} from "~/modules/materials";
import { createDbSessionFactory } from "~/platform/db/session";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  buildStoredSupplier,
  ID_A,
  ID_B,
  runSupplierRepositoryContract,
} from "~/testing/contracts/supplier-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleSupplierRepository } from "./drizzle-supplier-repository";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function freshRepository() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  return {
    database,
    openSession,
    repo: createDrizzleSupplierRepository(openSession),
  };
}

runSupplierRepositoryContract(async () => (await freshRepository()).repo);

describe("createDrizzleSupplierRepository", () => {
  it("has exactly the supplier columns", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ column_name: string }>(
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = 'supplier' ORDER BY column_name`,
      );
      expect(rows.map((row) => row.column_name)).toEqual([
        "active",
        "email",
        "id",
        "name",
        "name_key",
        "notes",
        "phone",
        "updated_at",
        "updated_by",
      ]);
    } finally {
      await session.close();
    }
  });

  it("maps the active-name unique constraint to SupplierNameConflictError", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredSupplier());

    await expect(
      repo.insert(buildStoredSupplier({ id: ID_B, name: "LUCÍA PÉREZ" })),
    ).rejects.toBeInstanceOf(SupplierNameConflictError);
  });

  it("does not map a duplicate primary key to SupplierNameConflictError", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredSupplier());

    const failure = await repo
      .insert(buildStoredSupplier({ name: "Other supplier" }))
      .catch((error: unknown) => error);

    expect(failure).not.toBeInstanceOf(SupplierNameConflictError);
  });

  it("closes the session after every call", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const open = createDbSessionFactory({ connectionString: database.url });
    const state = { opened: 0, closed: 0 };
    const repo = createDrizzleSupplierRepository(async () => {
      const session = await open();
      state.opened += 1;
      return {
        db: session.db,
        close: () => {
          state.closed += 1;
          return session.close();
        },
      };
    });

    await repo.insert(buildStoredSupplier());
    await repo.update(buildStoredSupplier());
    await repo.findById(ID_A);
    await repo.findActiveByName("x");
    await repo.list("all");
    await repo.insert(buildStoredSupplier()).catch(() => undefined);

    expect(state.closed).toBe(state.opened);
    expect(state.opened).toBeGreaterThanOrEqual(6);
  });

  it("translates a unique-index write race into the typed duplicate result", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredSupplier({ name: "Casa Pincel" }));
    const racingRepository: SupplierRepository = {
      ...repo,
      findActiveByName: () => Promise.resolve(null),
    };
    const service = createSuppliersService({
      repository: racingRepository,
      clock: fixedClock(new Date("2026-10-16T08:30:00.000Z")),
      newId: () => ID_B,
    });

    await expect(
      service.create(testAdminActor("admin@example.com"), {
        name: "CASA PINCEL",
        phone: "",
        email: "",
        notes: "",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "name", code: "duplicate" }],
      },
    });
  });
});
