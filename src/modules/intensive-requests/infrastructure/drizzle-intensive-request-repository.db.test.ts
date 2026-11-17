import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { createDrizzleIntensiveRepository } from "~/modules/workshops/infrastructure/drizzle-intensive-repository";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  buildStoredIntensive,
  ID_A,
} from "~/testing/contracts/intensive-repository.contract";
import { buildNewProject } from "~/testing/contracts/intensive-project-repository.contract";
import {
  buildStoredRequest,
  runIntensiveRequestRepositoryContract,
} from "~/testing/contracts/intensive-request-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleIntensiveRequestRepository } from "./drizzle-intensive-request-repository";

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
    openSession,
    repo: createDrizzleIntensiveRequestRepository(openSession),
  };
}

runIntensiveRequestRepositoryContract(
  async () => (await freshRepository()).repo,
);

describe("createDrizzleIntensiveRequestRepository", () => {
  it("has exactly the seat request columns", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ column_name: string }>(
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = 'intensive_seat_request' ORDER BY column_name`,
      );
      expect(rows.map((row) => row.column_name)).toEqual([
        "balance_at",
        "balance_by",
        "balance_centavos",
        "balance_note",
        "balance_paid_on",
        "cancel_reason",
        "cancelled_at",
        "cancelled_by",
        "confirmed_at",
        "confirmed_by",
        "created_at",
        "deposit_centavos",
        "email",
        "full_name",
        "id",
        "intensive_id",
        "paid_centavos",
        "paid_on",
        "payment_note",
        "phone_digits",
        "policy_accepted_at",
        "price_centavos",
        "project_id",
        "public_id",
        "status",
      ]);
    } finally {
      await session.close();
    }
  });

  it("refuses an unknown status and a confirmed row without a deposit at the database", async () => {
    const { repo } = await freshRepository();

    await expect(
      repo.insert(buildStoredRequest({ status: "otra" as never })),
    ).rejects.toThrow();
    await expect(
      repo.insert(buildStoredRequest({ status: "confirmed" })),
    ).rejects.toThrow();
  });

  it("rejects a duplicate public id instead of reporting a duplicate request", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredRequest());

    await expect(
      repo.insert(
        buildStoredRequest({
          id: "3a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04",
          email: "otra@example.com",
        }),
      ),
    ).rejects.toThrow();
  });
});

const PROJECT_ONE = "c0000000-0000-4000-8000-0000000000c1";
const PROJECT_TWO = "c0000000-0000-4000-8000-0000000000c2";
const OTHER_INTENSIVE = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9aa2";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad money");
  return money.value;
};

/** A workshop with two projects (30.000/10.000 and 50.000/20.000) and a second one with none. */
async function seedWorkshops() {
  const fresh = await freshRepository();
  const workshops = createDrizzleIntensiveRepository(fresh.openSession);
  const plain = { teacherId: null, percentage: null, images: [] };
  await workshops.insert(
    buildStoredIntensive({ ...plain, status: "published" }),
    buildNewProject({ id: PROJECT_ONE }),
  );
  await workshops.addProject(
    buildNewProject({
      id: PROJECT_TWO,
      name: "Plato hondo",
      price: pesos(50000),
      deposit: pesos(20000),
    }),
  );
  await workshops.insert(
    buildStoredIntensive({
      ...plain,
      id: OTHER_INTENSIVE,
      slug: "otro-workshop",
    }),
  );
  return { ...fresh, workshops };
}

const withProject = (projectId: string, price: number, deposit: number) =>
  buildStoredRequest({
    projectId,
    price: pesos(price),
    deposit: pesos(deposit),
  });

describe("project choice", () => {
  it("stores the project with its price and deposit snapshot and reads them back", async () => {
    const { repo } = await seedWorkshops();

    expect(await repo.insert(withProject(PROJECT_TWO, 50000, 20000))).toEqual({
      ok: true,
      value: undefined,
    });

    const stored = await repo.findById(buildStoredRequest().id);
    expect(stored?.projectId).toBe(PROJECT_TWO);
    expect(stored?.price?.toCentavos()).toBe(5_000_000);
    expect(stored?.deposit?.toCentavos()).toBe(2_000_000);
  });

  it("keeps the snapshot when the project is edited afterwards", async () => {
    const { repo, workshops } = await seedWorkshops();
    await repo.insert(withProject(PROJECT_ONE, 30000, 10000));
    const project = await workshops.findProject(ID_A, PROJECT_ONE);
    if (!project) throw new Error("no project");

    await workshops.updateProject({
      ...project,
      name: "Renombrado",
      price: pesos(90000),
      deposit: pesos(40000),
    });

    const stored = await repo.findById(buildStoredRequest().id);
    expect(stored?.price?.toCentavos()).toBe(3_000_000);
    expect(stored?.deposit?.toCentavos()).toBe(1_000_000);
  });

  it("refuses an unknown project and writes no row", async () => {
    const { repo } = await seedWorkshops();

    const result = await repo.insert(
      withProject("c0000000-0000-4000-8000-0000000000ff", 30000, 10000),
    );

    expect(result).toEqual({ ok: false, error: { kind: "unknown-project" } });
    expect(await repo.findById(buildStoredRequest().id)).toBeNull();
  });

  it("refuses a project that belongs to another workshop", async () => {
    const { repo } = await seedWorkshops();

    const result = await repo.insert(
      buildStoredRequest({
        intensiveId: OTHER_INTENSIVE,
        projectId: PROJECT_ONE,
        price: pesos(30000),
        deposit: pesos(10000),
      }),
    );

    expect(result).toEqual({ ok: false, error: { kind: "unknown-project" } });
    expect(await repo.findById(buildStoredRequest().id)).toBeNull();
  });

  it("refuses a request for a project that was deleted", async () => {
    const { repo, workshops } = await seedWorkshops();
    expect(await workshops.deleteProject(ID_A, PROJECT_TWO)).toBe("deleted");

    const result = await repo.insert(withProject(PROJECT_TWO, 50000, 20000));

    expect(result).toEqual({ ok: false, error: { kind: "unknown-project" } });
    expect(await repo.findById(buildStoredRequest().id)).toBeNull();
  });

  it("never leaves a request pointing at a project deleted at the same moment", async () => {
    const { repo, workshops, openSession } = await seedWorkshops();
    const attempts = 12;
    const outcomes = await Promise.all(
      Array.from({ length: attempts }, async (_, index) => {
        const project = `c0000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`;
        await workshops.addProject(
          buildNewProject({ id: project, name: `Proyecto ${String(index)}` }),
        );
        const [deleted, inserted] = await Promise.all([
          workshops.deleteProject(ID_A, project),
          repo.insert(
            buildStoredRequest({
              id: `d0000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
              publicId: `public-id-${String(index)}-0000000`,
              email: `p${String(index)}@example.com`,
              projectId: project,
              price: pesos(30000),
              deposit: pesos(10000),
            }),
          ),
        ]);
        return { deleted, inserted };
      }),
    );

    // Either the delete saw the request (in-use) or the insert saw no project.
    for (const { deleted, inserted } of outcomes)
      expect(deleted === "deleted" ? !inserted.ok : inserted.ok).toBe(true);
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ dangling: number }>(
        sql`SELECT count(*)::int AS dangling FROM intensive_seat_request AS r
            WHERE r.project_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM intensive_project p WHERE p.id = r.project_id)`,
      );
      expect(rows[0]?.dangling).toBe(0);
    } finally {
      await session.close();
    }
  });
});
