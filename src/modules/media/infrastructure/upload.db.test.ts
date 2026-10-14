import { afterAll, describe, expect, it } from "vitest";
import { uploadImage } from "~/modules/media";
import { createDbSessionFactory } from "~/platform/db/session";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryImageStorage } from "~/testing/fakes/in-memory-image-storage";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { loadFixture } from "~/testing/media/fixtures";
import { createDrizzleMediaAssetRepository } from "./drizzle-media-asset-repository";

const actor = { kind: "admin-actor" as const, email: "admin@example.com" };
const clock = fixedClock(new Date("2026-10-14T12:00:00.000Z"));
const bytes = loadFixture("fixture.png");
const source = { read: () => Promise.resolve(bytes) };

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

describe("uploadImage with the Drizzle repository", () => {
  it("stores the object and persists a row readable back", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const repo = createDrizzleMediaAssetRepository(
      createDbSessionFactory({ connectionString: database.url }),
    );
    const storage = new InMemoryImageStorage();

    const result = await uploadImage(actor, source, storage, repo, clock);

    if (!result.ok) throw new Error("upload must succeed");
    expect(storage.keys).toEqual([`img/${result.value.fileName}`]);
    const found = await repo.findByIds([result.value.id]);
    expect(found.get(result.value.id)).toEqual(result.value);
  });

  it("removes the stored object and rethrows when the insert fails", async () => {
    const storage = new InMemoryImageStorage();
    const failure = new Error("database unreachable");
    const repo = createDrizzleMediaAssetRepository(() =>
      Promise.reject(failure),
    );

    await expect(uploadImage(actor, source, storage, repo, clock)).rejects.toBe(
      failure,
    );

    expect(storage.putCalls).toHaveLength(1);
    expect(storage.deleteCalls).toEqual([storage.putCalls[0]?.key]);
    expect(storage.keys).toEqual([]);
  });
});
