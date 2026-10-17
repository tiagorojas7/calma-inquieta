import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { StoredMonthlyWorkshop } from "~/modules/workshops/application/monthly-workshop-repository";
import {
  createDbSessionFactory,
  type DbSessionFactory,
} from "~/platform/db/session";
import { runMonthlyWorkshopRepositoryContract } from "~/testing/contracts/monthly-workshop-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleMonthlyWorkshopRepository } from "./drizzle-monthly-workshop-repository";
const databases: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(databases.map((database) => database.drop()));
});
async function freshRepository() {
  const database = await createTestDatabase();
  databases.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  const session = await openSession();
  try {
    await session.db.execute(sql`
      INSERT INTO teacher (id, name, name_key, bio_line, modality, active, updated_by, updated_at)
      VALUES ('00000000-0000-4000-8000-000000000099', 'Teacher', 'teacher', '', 'third_party', true, 'seed', now())`);
  } finally {
    await session.close();
  }
  return createDrizzleMonthlyWorkshopRepository(openSession);
}

const parsedFee = Money.fromCentavos(123400);
if (!parsedFee.ok) throw new Error("fixture");
const fee = parsedFee.value;

function workshop(id: string, slug: string): StoredMonthlyWorkshop {
  return {
    id,
    slug,
    name: "Cerámica",
    summary: "Resumen",
    description: "Descripción",
    technique: "Torno",
    defaultFee: fee,
    teacherId: null,
    percentage: null,
    status: "draft",
    audit: {
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-01-01T00:00:00.123Z"),
    },
  };
}

const ID_A = "00000000-0000-4000-8000-000000000001";
const ID_B = "00000000-0000-4000-8000-000000000002";

runMonthlyWorkshopRepositoryContract(freshRepository);

describe("DrizzleMonthlyWorkshopRepository PostgreSQL conflict mapping", () => {
  it("settles an insert slug race as a typed conflict", async () => {
    const repo = await freshRepository();
    const [first, second] = await Promise.all([
      repo.insert(workshop(ID_A, "shared")),
      repo.insert(workshop(ID_B, "shared")),
    ]);

    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect(first.ok ? second : first).toEqual({
      ok: false,
      error: { kind: "slug-conflict" },
    });
  });

  it("settles an update slug race as a typed conflict", async () => {
    const repo = await freshRepository();
    await repo.insert(workshop(ID_A, "one"));

    const [inserted, updated] = await Promise.all([
      repo.insert(workshop(ID_B, "two")),
      repo.update(workshop(ID_A, "two")),
    ]);

    expect([inserted.ok, updated.ok].sort()).toEqual([false, true]);
    expect(inserted.ok ? updated : inserted).toEqual({
      ok: false,
      error: { kind: "slug-conflict" },
    });
  });

  it("rejects a primary-key 23505 instead of mapping it", async () => {
    const repo = await freshRepository();
    await repo.insert(workshop(ID_A, "one"));

    await expect(repo.insert(workshop(ID_A, "two"))).rejects.toThrow();
  });

  it("maps only a nested PostgreSQL slug constraint conflict", async () => {
    const nestedSlugConflict = Object.assign(new Error("query failed"), {
      cause: {
        code: "23505",
        constraint: "monthly_workshop_slug_unique",
      },
    });
    const nestedUnrelatedConflict = Object.assign(new Error("query failed"), {
      cause: { code: "23505", constraint: "monthly_workshop_pkey" },
    });
    const repositoryRejectingInsert = (error: Error) => {
      const openSession: DbSessionFactory = () =>
        Promise.resolve({
          db: {
            insert: () => ({ values: () => Promise.reject(error) }),
          },
          close: () => Promise.resolve(),
        } as never);
      return createDrizzleMonthlyWorkshopRepository(openSession);
    };

    await expect(
      repositoryRejectingInsert(nestedSlugConflict).insert(
        workshop(ID_A, "nested-slug"),
      ),
    ).resolves.toEqual({ ok: false, error: { kind: "slug-conflict" } });
    await expect(
      repositoryRejectingInsert(nestedUnrelatedConflict).insert(
        workshop(ID_A, "nested-primary-key"),
      ),
    ).rejects.toThrow("query failed");
  });
});
