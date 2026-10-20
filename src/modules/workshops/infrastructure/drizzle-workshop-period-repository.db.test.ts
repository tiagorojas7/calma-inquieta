import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { StoredWorkshopPeriod } from "~/modules/workshops/application/workshop-period-repository";
import { createDbSessionFactory } from "~/platform/db/session";
import { runWorkshopPeriodRepositoryContract } from "~/testing/contracts/workshop-period-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleWorkshopPeriodRepository } from "./drizzle-workshop-period-repository";

const databases: TestDatabase[] = [];
const IDS = {
  workshop: "00000000-0000-4000-8000-000000000001",
  otherWorkshop: "00000000-0000-4000-8000-000000000002",
  teacher: "00000000-0000-4000-8000-000000000301",
  turno: "00000000-0000-4000-8000-000000000201",
  retiredTurno: "00000000-0000-4000-8000-000000000202",
  supplier: "00000000-0000-4000-8000-000000000401",
  material1: "00000000-0000-4000-8000-000000000501",
  material2: "00000000-0000-4000-8000-000000000502",
  material3: "00000000-0000-4000-8000-000000000503",
  material4: "00000000-0000-4000-8000-000000000504",
};

afterAll(async () => {
  await Promise.all(databases.map((database) => database.drop()));
});

const fee = (() => {
  const parsed = Money.fromCentavos(100);
  if (!parsed.ok) throw new Error("fixture money");
  return parsed.value;
})();

function period(
  overrides: Partial<StoredWorkshopPeriod> = {},
): StoredWorkshopPeriod {
  return {
    id: "00000000-0000-4000-8000-000000000101",
    workshopId: IDS.workshop,
    period: "2026-10",
    fee,
    materialsRequired: false,
    status: "draft",
    project: { title: "Project", description: "Description", images: [] },
    turnos: [
      {
        turnoId: IDS.turno,
        label: "Morning",
        weekday: 1,
        startsAt: "10:00",
        endsAt: "12:00",
        turnoActive: true,
        capacity: 8,
      },
    ],
    materials: [],
    snapshot: {
      teacher: { id: IDS.teacher, name: "Teacher", active: true },
      modality: "own",
      percentage: null,
    },
    openedBy: "owner@example.com",
    openedAt: new Date("2026-10-01T03:00:00.000Z"),
    audit: {
      updatedBy: "owner@example.com",
      updatedAt: new Date("2026-10-01T03:00:00.000Z"),
    },
    ...overrides,
  };
}

function firstTurno() {
  const turno = period().turnos[0];
  if (!turno) throw new Error("fixture turno");
  return turno;
}

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
      VALUES (${IDS.teacher}, 'Teacher', 'teacher', '', 'own', true, 'seed', now())`);
    await session.db.execute(sql`
      INSERT INTO monthly_workshop
        (id, slug, name, summary, description, technique, default_fee_centavos, status, updated_by, updated_at)
      VALUES
        (${IDS.workshop}, 'workshop', 'Workshop', '', '', '', 100, 'published', 'seed', now()),
        (${IDS.otherWorkshop}, 'other-workshop', 'Other workshop', '', '', '', 100, 'published', 'seed', now())`);
    await session.db.execute(sql`
      INSERT INTO workshop_turno
        (id, workshop_id, label, label_key, weekday, starts_at, ends_at, default_capacity, active)
      VALUES
        (${IDS.turno}, ${IDS.workshop}, 'Morning', 'morning', 1, '10:00', '12:00', 8, true),
        (${IDS.retiredTurno}, ${IDS.workshop}, 'Retired', 'retired', 2, '10:00', '12:00', 8, false)`);
    await session.db.execute(sql`
      INSERT INTO supplier
        (id, name, name_key, active, updated_by, updated_at)
      VALUES (${IDS.supplier}, 'Supplier', 'supplier', true, 'seed', now())`);
    await session.db.execute(sql`
      INSERT INTO material
        (id, name, name_key, description, category, category_key, supplier_id,
         available, active, updated_by, updated_at)
      VALUES
        (${IDS.material1}, 'Material 1', 'material-1', 'Description', 'Category', 'category', ${IDS.supplier}, true, true, 'seed', now()),
        (${IDS.material2}, 'Material 2', 'material-2', 'Description', 'Category', 'category', ${IDS.supplier}, true, true, 'seed', now()),
        (${IDS.material3}, 'Material 3', 'material-3', 'Description', 'Category', 'category', ${IDS.supplier}, true, true, 'seed', now()),
        (${IDS.material4}, 'Material 4', 'material-4', 'Description', 'Category', 'category', ${IDS.supplier}, true, true, 'seed', now())`);
  } finally {
    await session.close();
  }
  return {
    openSession,
    repo: createDrizzleWorkshopPeriodRepository(openSession),
  };
}

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return "cause" in error ? sqlState(error.cause) : undefined;
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected rejection");
    },
    (error: unknown) => error,
  );
}

runWorkshopPeriodRepositoryContract(
  async () => (await freshRepository()).repo,
  { persistsImages: false },
);

describe("createDrizzleWorkshopPeriodRepository", () => {
  it("settles a duplicate race as one typed period-exists result", async () => {
    const { repo } = await freshRepository();
    const [first, second] = await Promise.all([
      repo.insert(period({ id: "00000000-0000-4000-8000-000000000102" })),
      repo.insert(period({ id: "00000000-0000-4000-8000-000000000103" })),
    ]);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].filter((result) => !result.ok)).toHaveLength(1);
  });

  it("enforces foreign keys and period, fee, snapshot, capacity checks", async () => {
    const { repo } = await freshRepository();
    await expect(
      rejection(
        repo.insert(period({ workshopId: IDS.otherWorkshop, period: "bad" })),
      ),
    ).resolves.toSatisfy((error: unknown) => sqlState(error) === "23514");
    await expect(
      rejection(
        repo.insert(
          period({
            fee: { toCentavos: () => 0 } as StoredWorkshopPeriod["fee"],
          }),
        ),
      ),
    ).resolves.toSatisfy((error: unknown) => sqlState(error) === "23514");
    await expect(
      rejection(
        repo.insert(period({ turnos: [{ ...firstTurno(), capacity: 501 }] })),
      ),
    ).resolves.toSatisfy((error: unknown) => sqlState(error) === "23514");
  });

  it("rolls the compound root and turno insert back when a child row is refused", async () => {
    const { repo } = await freshRepository();
    const value = period({
      turnos: [
        ...period().turnos,
        {
          ...firstTurno(),
          turnoId: "00000000-0000-4000-8000-000000000299",
        },
      ],
    });
    await expect(repo.insert(value)).rejects.toThrow();
    expect(await repo.findById(value.id)).toBeNull();
  });

  it("orders periods deterministically and keeps the teacher name snapshot after teacher edits", async () => {
    const { repo, openSession } = await freshRepository();
    await repo.insert(
      period({ id: "00000000-0000-4000-8000-000000000102", period: "2026-09" }),
    );
    await repo.insert(
      period({ id: "00000000-0000-4000-8000-000000000103", period: "2026-11" }),
    );
    expect(
      (await repo.listForWorkshop(IDS.workshop)).map((item) => item.period),
    ).toEqual(["2026-11", "2026-09"]);
    const session = await openSession();
    try {
      await session.db.execute(
        sql`UPDATE teacher SET name = 'Changed', active = false WHERE id = ${IDS.teacher}`,
      );
    } finally {
      await session.close();
    }
    expect(
      (await repo.findById("00000000-0000-4000-8000-000000000103"))?.snapshot,
    ).toMatchObject({
      teacher: { name: "Teacher", active: false },
      modality: "own",
    });
  });

  it("keeps stored period state read-only across find and list reads", async () => {
    const { repo, openSession } = await freshRepository();
    const value = period();
    await repo.insert(value);
    const session = await openSession();
    try {
      const before = await session.db.execute<{
        status: string;
        updated_by: string;
        updated_at: string;
      }>(sql`
        SELECT status, updated_by, updated_at FROM workshop_period
        WHERE id = ${value.id}`);
      await repo.findById(value.id);
      await repo.listForWorkshop(value.workshopId);
      const after = await session.db.execute<{
        status: string;
        updated_by: string;
        updated_at: string;
      }>(sql`
        SELECT status, updated_by, updated_at FROM workshop_period
        WHERE id = ${value.id}`);
      expect(after.rows).toEqual(before.rows);
    } finally {
      await session.close();
    }
  });

  it("keeps stored snapshot identity, name, modality, and percentage across assignment and teacher edits", async () => {
    const { repo, openSession } = await freshRepository();
    const value = period({
      snapshot: {
        teacher: { id: IDS.teacher, name: "Teacher", active: true },
        modality: "third_party",
        percentage: { basisPoints: 2500 },
      },
    });
    await repo.insert(value);
    const replacementTeacher = "00000000-0000-4000-8000-000000000302";
    const session = await openSession();
    try {
      await session.db.execute(sql`
        INSERT INTO teacher
          (id, name, name_key, bio_line, modality, active, updated_by, updated_at)
        VALUES (${replacementTeacher}, 'Replacement', 'replacement', '', 'own', true, 'seed', now())`);
      await session.db.execute(sql`
        UPDATE monthly_workshop
        SET teacher_id = ${replacementTeacher}, agreed_percentage_bp = null
        WHERE id = ${IDS.workshop}`);
      await session.db.execute(sql`
        UPDATE teacher
        SET name = 'Changed teacher', modality = 'own', active = false
        WHERE id = ${IDS.teacher}`);
    } finally {
      await session.close();
    }
    expect(await repo.findById(value.id)).toMatchObject({
      snapshot: {
        teacher: { id: IDS.teacher, name: "Teacher", active: false },
        modality: "third_party",
        percentage: { basisPoints: 2500 },
      },
    });
  });

  it("persists per-turno capacities, uses EXISTS, deletes only drafts, and rejects deferred images", async () => {
    const { repo } = await freshRepository();
    const value = period({
      turnos: [{ ...firstTurno(), capacity: 17 }],
    });
    await repo.insert(value);
    expect((await repo.findById(value.id))?.turnos[0]?.capacity).toBe(17);
    expect(await repo.isTurnoUsed(IDS.turno)).toBe(true);
    expect(await repo.deleteDraft(value.id)).toBe("deleted");
    await expect(
      repo.insert(
        period({
          project: {
            title: "Project",
            description: "",
            images: [{ assetId: "asset", alt: "Alt", asset: null }],
          },
        }),
      ),
    ).rejects.toThrow(/image/i);
  });

  it("rolls root and offer inserts back when a material reference is refused", async () => {
    const { repo } = await freshRepository();
    const value = period({
      materials: [
        {
          id: "00000000-0000-4000-8000-000000000599",
          name: "Missing",
          active: true,
          available: true,
        },
      ],
    });
    await expect(repo.insert(value)).rejects.toThrow();
    expect(await repo.findById(value.id)).toBeNull();
  });

  it("rolls root and offer replacement back together", async () => {
    const { repo } = await freshRepository();
    const original = period({
      materials: [
        {
          id: IDS.material1,
          name: "Material 1",
          active: true,
          available: true,
        },
      ],
    });
    await repo.insert(original);

    await expect(
      repo.update({
        ...original,
        materialsRequired: true,
        materials: [
          {
            id: "00000000-0000-4000-8000-000000000599",
            name: "Missing",
            active: true,
            available: true,
          },
        ],
      }),
    ).rejects.toThrow();
    expect(await repo.findById(original.id)).toEqual(original);
  });

  it("enforces offer material, position, and per-period uniqueness constraints", async () => {
    const { repo, openSession } = await freshRepository();
    const value = period();
    await repo.insert(value);
    const session = await openSession();
    try {
      await session.db.execute(sql`
        INSERT INTO period_material_offer (period_id, material_id, position)
        VALUES (${value.id}, ${IDS.material1}, 0)`);
      await expect(
        rejection(
          session.db.execute(sql`
            INSERT INTO period_material_offer (period_id, material_id, position)
            VALUES (${value.id}, ${IDS.material1}, 1)`),
        ),
      ).resolves.toSatisfy((error: unknown) => sqlState(error) === "23505");
      await expect(
        rejection(
          session.db.execute(sql`
            INSERT INTO period_material_offer (period_id, material_id, position)
            VALUES (${value.id}, ${IDS.material2}, 0)`),
        ),
      ).resolves.toSatisfy((error: unknown) => sqlState(error) === "23505");
      await expect(
        rejection(
          session.db.execute(sql`
            INSERT INTO period_material_offer (period_id, material_id, position)
            VALUES (${value.id}, ${IDS.material2}, -1)`),
        ),
      ).resolves.toSatisfy((error: unknown) => sqlState(error) === "23514");
    } finally {
      await session.close();
    }
  });

  it("keeps historical offers visible with current material state", async () => {
    const { repo, openSession } = await freshRepository();
    const value = period({
      materials: [
        {
          id: IDS.material2,
          name: "Material 2",
          active: true,
          available: true,
        },
        {
          id: IDS.material1,
          name: "Material 1",
          active: true,
          available: true,
        },
      ],
    });
    await repo.insert(value);
    const session = await openSession();
    try {
      await session.db.execute(
        sql`UPDATE material SET active = false WHERE id = ${IDS.material2}`,
      );
      await session.db.execute(
        sql`UPDATE material SET available = false WHERE id = ${IDS.material1}`,
      );
    } finally {
      await session.close();
    }
    expect((await repo.findById(value.id))?.materials).toEqual([
      {
        id: IDS.material2,
        name: "Material 2",
        active: false,
        available: true,
      },
      {
        id: IDS.material1,
        name: "Material 1",
        active: true,
        available: false,
      },
    ]);
  });
});
