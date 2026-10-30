import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { seedCatalog } from "~/testing/db/seed-catalog";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import {
  buildSeed,
  seedIntensivo,
  type CatalogSeed,
} from "~/testing/fakes/catalog-seed";
import { createDrizzleIntensiveInsightsReader } from "./drizzle-intensive-insights-reader";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function readerFor(seed: CatalogSeed) {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  await seedCatalog(openSession, seed);
  return createDrizzleIntensiveInsightsReader(openSession);
}

describe("createDrizzleIntensiveInsightsReader", () => {
  it("lists the intensivos held in a month, without drafts or cancelled ones", async () => {
    const held = seedIntensivo({
      name: "Torno",
      eventDate: "2026-11-14",
      capacity: 8,
    });
    const draft = seedIntensivo({ eventDate: "2026-11-20", status: "draft" });
    const cancelled = seedIntensivo({
      eventDate: "2026-11-21",
      status: "cancelled",
    });
    const other = seedIntensivo({ eventDate: "2026-12-05" });
    const reader = await readerFor(
      buildSeed({ intensivos: [other, cancelled, draft, held] }),
    );

    const rows = await reader.intensives("2026-11");

    expect(rows).toEqual([
      {
        intensiveId: held.id,
        name: "Torno",
        eventDate: "2026-11-14",
        capacity: 8,
        teacherId: null,
        percentageBp: null,
      },
    ]);
  });
});
