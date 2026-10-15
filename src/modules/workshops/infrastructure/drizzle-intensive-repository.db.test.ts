import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  IntensiveRepository,
  StoredIntensive,
} from "~/modules/workshops/application/intensive-repository";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  ASSET_1,
  ASSET_2,
  buildStoredIntensive,
  ID_A,
  ID_B,
  ID_UNKNOWN,
  plainIntensive,
  runIntensiveRepositoryContract,
  TEACHER_ID,
} from "~/testing/contracts/intensive-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleIntensiveRepository } from "./drizzle-intensive-repository";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

type OpenSession = ReturnType<typeof createDbSessionFactory>;

/** The teacher and the two media assets the contract fixtures refer to. */
async function seedReferences(openSession: OpenSession) {
  const session = await openSession();
  try {
    await session.db.execute(sql`
      INSERT INTO teacher (id, name, name_key, bio_line, modality, active, updated_by, updated_at)
      VALUES (${TEACHER_ID}, 'Lucia', 'lucia', 'Ceramista', 'third_party', true, 'seed', now())`);
    for (const [id, key] of [
      [ASSET_1, "img/a1.jpg"],
      [ASSET_2, "img/a2.jpg"],
    ] as const)
      await session.db.execute(sql`
        INSERT INTO media_asset (id, storage_key, content_type, byte_size, width, height, created_by, created_at)
        VALUES (${id}, ${key}, 'image/jpeg', 1, 1, 1, 'seed', now())`);
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
  await seedReferences(openSession);
  return {
    database,
    openSession,
    repo: createDrizzleIntensiveRepository(openSession),
  };
}

runIntensiveRepositoryContract(async () => (await freshRepository()).repo);

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return "cause" in error ? sqlState(error.cause) : undefined;
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
};

const checkViolations: readonly (readonly [
  string,
  Partial<StoredIntensive>,
])[] = [
  ["a deposit above the price", { deposit: pesos(40000) }],
  ["minimum seats above the capacity", { minSeats: 9 }],
  ["a percentage without a teacher", { teacherId: null }],
  ["a percentage above 100 %", { percentage: { basisPoints: 10001 } }],
  ["a slug with uppercase letters", { slug: "Mala" }],
  ["a slug with a double dash", { slug: "mala--slug" }],
  ["an end before the start", { startsAt: "18:00", endsAt: "09:00" }],
  ["a zero price", { price: pesos(0), deposit: pesos(0) }],
  ["a capacity above 500", { capacity: 501, minSeats: 1 }],
  ["an unknown status", { status: "gone" as never }],
  ["a blank image description", { images: [{ assetId: ASSET_1, alt: " " }] }],
  [
    "seven images",
    {
      images: Array.from({ length: 7 }, () => ({
        assetId: ASSET_1,
        alt: "x",
      })),
    },
  ],
];

describe("createDrizzleIntensiveRepository", () => {
  it("has exactly the intensivo columns and no cancellation deadline", async () => {
    const { openSession } = await freshRepository();
    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ column_name: string }>(
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = 'intensive_workshop' ORDER BY column_name`,
      );
      expect(rows.map((row) => row.column_name)).toEqual([
        "agreed_percentage_bp",
        "capacity",
        "deposit_centavos",
        "description",
        "ends_at",
        "event_date",
        "id",
        "materials_included",
        "min_seats",
        "name",
        "policy_text",
        "price_centavos",
        "slug",
        "starts_at",
        "status",
        "summary",
        "teacher_id",
        "updated_at",
        "updated_by",
      ]);
    } finally {
      await session.close();
    }
  });

  it.each(checkViolations)(
    "rejects %s with a check violation, not a slug conflict",
    async (_, patch) => {
      const { repo } = await freshRepository();

      const error = await rejection(repo.insert(buildStoredIntensive(patch)));

      expect(sqlState(error)).toBe("23514");
      expect(await repo.findById(ID_A)).toBeNull();
    },
  );

  it("restricts deleting a teacher or a media asset that an intensivo uses", async () => {
    const { repo, openSession } = await freshRepository();
    await repo.insert(buildStoredIntensive());
    const session = await openSession();
    try {
      expect(
        sqlState(
          await rejection(
            session.db.execute(
              sql`DELETE FROM teacher WHERE id = ${TEACHER_ID}`,
            ),
          ),
        ),
      ).toBe("23503");
      expect(
        sqlState(
          await rejection(
            session.db.execute(
              sql`DELETE FROM media_asset WHERE id = ${ASSET_1}`,
            ),
          ),
        ),
      ).toBe("23503");
    } finally {
      await session.close();
    }
  });

  it("rejects an unknown teacher or media asset and writes nothing", async () => {
    const { repo } = await freshRepository();

    expect(
      sqlState(
        await rejection(
          repo.insert(buildStoredIntensive({ teacherId: ID_UNKNOWN })),
        ),
      ),
    ).toBe("23503");
    expect(
      sqlState(
        await rejection(
          repo.insert(
            buildStoredIntensive({
              images: [{ assetId: ID_UNKNOWN, alt: "x" }],
            }),
          ),
        ),
      ),
    ).toBe("23503");
    expect(await repo.list(["draft"])).toEqual([]);
  });

  it("rolls the whole update back when the new gallery cannot be stored", async () => {
    const { repo } = await freshRepository();
    const original = buildStoredIntensive();
    await repo.insert(original);

    const error = await rejection(
      repo.update(
        buildStoredIntensive({
          name: "Cambiado",
          images: [{ assetId: ID_UNKNOWN, alt: "x" }],
        }),
      ),
    );

    expect(sqlState(error)).toBe("23503");
    expect(plainIntensive(await repo.findById(ID_A))).toEqual(
      plainIntensive(original),
    );
  });

  it("cascades the gallery away with a deleted draft", async () => {
    const { repo, openSession } = await freshRepository();
    await repo.insert(buildStoredIntensive());

    expect(await repo.deleteDraft(ID_A)).toBe("deleted");

    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ n: string }>(
        sql`SELECT count(*) AS n FROM intensive_image`,
      );
      expect(rows[0]?.n).toBe("0");
    } finally {
      await session.close();
    }
  });

  it("settles a slug race between two inserts as one success and one typed conflict", async () => {
    const { repo } = await freshRepository();

    const [first, second] = await Promise.all([
      repo.insert(buildStoredIntensive({ id: ID_A })),
      repo.insert(buildStoredIntensive({ id: ID_B })),
    ]);

    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    const loser = first.ok ? second : first;
    expect(loser).toEqual({ ok: false, error: { kind: "slug-conflict" } });
    expect(await repo.list(["draft"])).toHaveLength(1);
  });

  it("settles a slug race between an insert and an update", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredIntensive({ id: ID_A, slug: "uno" }));

    const [inserted, updated] = await Promise.all([
      repo.insert(buildStoredIntensive({ id: ID_B, slug: "dos" })),
      repo.update(buildStoredIntensive({ id: ID_A, slug: "dos" })),
    ]);

    expect([inserted.ok, updated.ok].sort()).toEqual([false, true]);
  });

  it("does not map a duplicate primary key to a slug conflict", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildStoredIntensive());

    const error = await rejection(
      repo.insert(buildStoredIntensive({ slug: "otro" })),
    );

    expect(sqlState(error)).toBe("23505");
  });

  it("returns times as HH:MM and the date as plain text", async () => {
    const { repo } = await freshRepository();
    await repo.insert(
      buildStoredIntensive({
        eventDate: "2026-01-05",
        startsAt: "00:00",
        endsAt: "23:59",
      }),
    );

    expect(await repo.findById(ID_A)).toMatchObject({
      eventDate: "2026-01-05",
      startsAt: "00:00",
      endsAt: "23:59",
    });
  });

  it("opens no session to list no statuses and closes every other one", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const open = createDbSessionFactory({ connectionString: database.url });
    await seedReferences(open);
    const state = { opened: 0, closed: 0 };
    const repo: IntensiveRepository = createDrizzleIntensiveRepository(
      async () => {
        const session = await open();
        state.opened += 1;
        return {
          db: session.db,
          close: () => {
            state.closed += 1;
            return session.close();
          },
        };
      },
    );

    expect(await repo.list([])).toEqual([]);
    expect(state.opened).toBe(0);

    await repo.insert(buildStoredIntensive());
    await repo.update(buildStoredIntensive({ name: "Otro" }));
    await repo.findById(ID_A);
    await repo.findBySlug("ceramica-fin-de-semana");
    await repo.list(["draft"]);
    await repo.deleteDraft(ID_A);
    await repo.insert(buildStoredIntensive()).catch(() => undefined);
    await repo.insert(buildStoredIntensive()).catch(() => undefined);

    expect(state.closed).toBe(state.opened);
    expect(state.opened).toBeGreaterThanOrEqual(8);
  });
});
