import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import {
  buildAsset,
  runMediaAssetRepositoryContract,
} from "~/testing/contracts/media-asset-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleMediaAssetRepository } from "./drizzle-media-asset-repository";

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
    repo: createDrizzleMediaAssetRepository(openSession),
  };
}

runMediaAssetRepositoryContract(async () => (await freshRepository()).repo);

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return "cause" in error ? sqlState(error.cause) : undefined;
}

describe("createDrizzleMediaAssetRepository", () => {
  it("stores the storage key as img/<file name>", async () => {
    const { openSession, repo } = await freshRepository();
    const asset = buildAsset();
    await repo.insert(asset);

    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{ storage_key: string }>(
        sql`SELECT storage_key FROM media_asset`,
      );
      expect(rows.map((row) => row.storage_key)).toEqual([
        `img/${asset.fileName}`,
      ]);
    } finally {
      await session.close();
    }
  });

  it("reports unique violations with SQLSTATE 23505", async () => {
    const { repo } = await freshRepository();
    await repo.insert(buildAsset());

    const failure = await repo.insert(buildAsset()).catch((e: unknown) => e);

    expect(sqlState(failure)).toBe("23505");
  });

  it.each([
    ["unsupported content type", { contentType: "image/gif" }],
    ["zero byte size", { byteSize: 0 }],
    ["byte size over 5 MiB", { byteSize: 5 * 1024 * 1024 + 1 }],
    ["zero width", { width: 0 }],
    ["width over 10000", { width: 10001 }],
    ["zero height", { height: 0 }],
    ["height over 10000", { height: 10001 }],
  ])("rejects %s with SQLSTATE 23514", async (_name, overrides) => {
    const { repo } = await freshRepository();

    const failure = await repo
      .insert(buildAsset(overrides as never))
      .catch((e: unknown) => e);

    expect(sqlState(failure)).toBe("23514");
  });

  it("accepts the boundary values", async () => {
    const { repo } = await freshRepository();
    const asset = buildAsset({ byteSize: 5242880, width: 10000, height: 1 });

    await repo.insert(asset);

    expect((await repo.findByIds([asset.id])).get(asset.id)).toEqual(asset);
  });

  it("closes the session after every call", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const open = createDbSessionFactory({ connectionString: database.url });
    const state = { opened: 0, closed: 0 };
    const repo = createDrizzleMediaAssetRepository(async () => {
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

    await repo.insert(buildAsset());
    await repo.findByIds([buildAsset().id]);
    await repo.findByIds([]);
    await repo.insert(buildAsset()).catch(() => undefined);

    expect(state.closed).toBe(state.opened);
    expect(state.opened).toBeGreaterThanOrEqual(3);
  });
});
