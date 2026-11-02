import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { StoredMonthlyWorkshop } from "~/modules/workshops/application/monthly-workshop-repository";
import type {
  StoredTurno,
  TurnoRepository,
} from "~/modules/workshops/application/turno-repository";
import {
  createDbSessionFactory,
  type DbSessionFactory,
} from "~/platform/db/session";
import { runTurnoRepositoryContract } from "~/testing/contracts/turno-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleTurnoRepository } from "./drizzle-turno-repository";

const created: TestDatabase[] = [];
const WORKSHOP_ID = "00000000-0000-4000-8000-000000000001";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000099";

afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

function storedTurno(overrides: Partial<StoredTurno> = {}): StoredTurno {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    workshopId: WORKSHOP_ID,
    label: "Mañana",
    labelKey: "mañana",
    weekday: 2,
    startsAt: "09:00",
    endsAt: "10:00",
    defaultCapacity: 8,
    active: true,
    ...overrides,
  };
}

const parsedFee = Money.fromCentavos(1000);
if (!parsedFee.ok) throw new Error("fixture");
const fee = parsedFee.value;

function storedWorkshop(
  overrides: Partial<StoredMonthlyWorkshop> = {},
): StoredMonthlyWorkshop {
  return {
    id: WORKSHOP_ID,
    slug: "ceramica",
    name: "Cerámica",
    summary: "Resumen",
    description: "Descripción",
    technique: "Torno",
    defaultFee: fee,
    teacherId: null,
    percentage: null,
    images: [],
    status: "draft",
    audit: {
      updatedBy: "old@example.com",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    ...overrides,
  };
}

async function freshRepository() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  const session = await openSession();
  try {
    await session.db.execute(sql`
      INSERT INTO monthly_workshop
        (id, slug, name, summary, description, technique, default_fee_centavos, status, updated_by, updated_at)
      VALUES
        (${WORKSHOP_ID}, 'ceramica', 'Cerámica', 'Resumen', 'Descripción', 'Torno', 1000, 'draft', 'old@example.com', '2026-01-01T00:00:00.000Z')`);
  } finally {
    await session.close();
  }
  return {
    database,
    openSession,
    repo: createDrizzleTurnoRepository(openSession),
  };
}

runTurnoRepositoryContract(async () => (await freshRepository()).repo);

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

describe("createDrizzleTurnoRepository", () => {
  it("normalizes label keys and clocks at the persistence boundary", async () => {
    const { repo } = await freshRepository();
    await repo.insert(
      storedTurno({ label: "MAN\u0303ANA", labelKey: "untrusted-key" }),
    );

    expect(await repo.findById(storedTurno().id)).toEqual(
      storedTurno({ label: "MAN\u0303ANA", labelKey: "mañana" }),
    );
  });

  it.each([
    ["weekday", { weekday: 8 as never }],
    ["end before start", { startsAt: "10:00", endsAt: "09:00" }],
    ["capacity", { defaultCapacity: 501 }],
  ] as const)(
    "rejects an invalid %s with a CHECK violation",
    async (_, patch) => {
      const { repo } = await freshRepository();

      expect(sqlState(await rejection(repo.insert(storedTurno(patch))))).toBe(
        "23514",
      );
      expect(await repo.findById(storedTurno().id)).toBeNull();
    },
  );

  it("rejects an unknown workshop with its foreign-key violation", async () => {
    const { repo } = await freshRepository();

    expect(
      sqlState(
        await rejection(repo.insert(storedTurno({ workshopId: UNKNOWN_ID }))),
      ),
    ).toBe("23503");
  });

  it("mutates the turno and owner audit atomically", async () => {
    const { repo } = await freshRepository();
    const workshop = storedWorkshop({
      audit: {
        updatedBy: "admin@example.com",
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      },
    });

    await expect(
      repo.mutate(workshop, { kind: "insert", value: storedTurno() }),
    ).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(
      repo.mutate(workshop, {
        kind: "update",
        value: storedTurno({ label: "Tarde", labelKey: "ignored" }),
      }),
    ).resolves.toEqual({ ok: true, value: undefined });
    await expect(
      repo.mutate(workshop, { kind: "delete", id: storedTurno().id }),
    ).resolves.toEqual({ ok: true, value: undefined });
    expect(await repo.findById(storedTurno().id)).toBeNull();
  });

  it("persists owner audit fields with a successful child mutation", async () => {
    const { repo, openSession } = await freshRepository();
    const audit = {
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
    };

    await expect(
      repo.mutate(storedWorkshop({ audit }), {
        kind: "insert",
        value: storedTurno(),
      }),
    ).resolves.toEqual({ ok: true, value: undefined });
    expect(await repo.findById(storedTurno().id)).toEqual(storedTurno());

    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{
        updated_by: string;
        updated_at: string;
      }>(sql`
        SELECT updated_by, updated_at FROM monthly_workshop
        WHERE id = ${WORKSHOP_ID}`);
      expect(rows[0]?.updated_by).toBe(audit.updatedBy);
      expect(new Date(rows[0]?.updated_at ?? "")).toEqual(audit.updatedAt);
    } finally {
      await session.close();
    }
  });

  it("writes the new turno into the open months in the same transaction", async () => {
    const { repo, openSession } = await freshRepository();
    const teacherId = "00000000-0000-4000-8000-000000000301";
    const periodId = "00000000-0000-4000-8000-000000000101";
    const session = await openSession();
    try {
      await session.db.execute(sql`
        INSERT INTO teacher (id, name, name_key, bio_line, modality, active, updated_by, updated_at)
        VALUES (${teacherId}, 'Docente', 'docente', '', 'own', true, 'seed', now())`);
      await session.db.execute(sql`
        INSERT INTO workshop_period
          (id, workshop_id, period, fee_centavos, materials_required, snapshot_teacher_id, snapshot_teacher_name, snapshot_teacher_modality, status, opened_by, opened_at, updated_by, updated_at)
        VALUES (${periodId}, ${WORKSHOP_ID}, '2026-12', 1000, false, ${teacherId}, 'Docente', 'own', 'open', 'seed', now(), 'seed', now())`);
    } finally {
      await session.close();
    }

    await expect(
      repo.mutate(storedWorkshop(), {
        kind: "insert",
        value: storedTurno(),
        joinPeriods: [{ periodId, capacity: 8 }],
      }),
    ).resolves.toEqual({ ok: true, value: undefined });
    const read = await openSession();
    try {
      const { rows } = await read.db.execute<{ capacity: number }>(sql`
        SELECT capacity FROM period_turno
        WHERE period_id = ${periodId} AND turno_id = ${storedTurno().id}`);
      expect(rows.map((row) => row.capacity)).toEqual([8]);
    } finally {
      await read.close();
    }

    await expect(
      repo.mutate(storedWorkshop(), {
        kind: "insert",
        value: storedTurno({
          id: "00000000-0000-4000-8000-000000000012",
          label: "Tarde",
        }),
        joinPeriods: [{ periodId: UNKNOWN_ID, capacity: 8 }],
      }),
    ).rejects.toBeDefined();
    expect(
      await repo.findById("00000000-0000-4000-8000-000000000012"),
    ).toBeNull();
  });

  it("rolls a child change back when its owner audit cannot be updated", async () => {
    const { repo } = await freshRepository();

    await expect(
      repo.mutate(storedWorkshop({ id: UNKNOWN_ID }), {
        kind: "insert",
        value: storedTurno(),
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "not-found" } });
    expect(await repo.findById(storedTurno().id)).toBeNull();
  });

  it("does not update the owner audit when the child mutation is refused", async () => {
    const { repo, openSession } = await freshRepository();
    await repo.insert(storedTurno());
    const workshop = storedWorkshop({
      audit: {
        updatedBy: "admin@example.com",
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      },
    });

    await expect(
      repo.mutate(workshop, {
        kind: "insert",
        value: storedTurno({
          id: "00000000-0000-4000-8000-000000000011",
          label: "MAN\u0303ANA",
        }),
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "label-conflict" } });
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ updated_by: string }>(sql`
        SELECT updated_by FROM monthly_workshop WHERE id = ${WORKSHOP_ID}`);
      expect(rows[0]?.updated_by).toBe("old@example.com");
    } finally {
      await session.close();
    }
  });

  it("maps only an exact nested turno-label unique violation", async () => {
    const nestedLabelConflict = Object.assign(new Error("query failed"), {
      cause: {
        code: "23505",
        constraint: "workshop_turno_workshop_label_key_unique",
      },
    });
    const nestedPrimaryKeyConflict = Object.assign(new Error("query failed"), {
      cause: { code: "23505", constraint: "workshop_turno_pkey" },
    });
    const rejectingRepository = (error: Error) => {
      const openSession: DbSessionFactory = () =>
        Promise.resolve({
          db: { insert: () => ({ values: () => Promise.reject(error) }) },
          close: () => Promise.resolve(),
        } as never);
      return createDrizzleTurnoRepository(openSession);
    };

    await expect(
      rejectingRepository(nestedLabelConflict).insert(storedTurno()),
    ).resolves.toEqual({ ok: false, error: { kind: "label-conflict" } });
    await expect(
      rejectingRepository(nestedPrimaryKeyConflict).insert(storedTurno()),
    ).rejects.toThrow("query failed");
  });

  it("closes each short-lived session, including rejected writes", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const open = createDbSessionFactory({ connectionString: database.url });
    const seed = await open();
    try {
      await seed.db.execute(sql`
        INSERT INTO monthly_workshop
          (id, slug, name, summary, description, technique, default_fee_centavos, status, updated_by, updated_at)
        VALUES
          (${WORKSHOP_ID}, 'ceramica', 'Cerámica', 'Resumen', 'Descripción', 'Torno', 1000, 'draft', 'old@example.com', now())`);
    } finally {
      await seed.close();
    }
    const state = { opened: 0, closed: 0 };
    const repo: TurnoRepository = createDrizzleTurnoRepository(async () => {
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

    await repo.insert(storedTurno());
    await repo.insert(storedTurno()).catch(() => undefined);
    await repo.findById(storedTurno().id);
    await repo.listForWorkshop(WORKSHOP_ID);
    await repo.countActiveForWorkshop(WORKSHOP_ID);
    await repo.delete(storedTurno().id);

    expect(state.closed).toBe(state.opened);
  });
});
