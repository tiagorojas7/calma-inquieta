import { afterAll, describe, expect, it } from "vitest";
import { policyVersion } from "~/platform/db/schema/policies";
import { createDbSessionFactory } from "~/platform/db/session";
import { runPolicyRepositoryContract } from "~/testing/contracts/policy-repository.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzlePolicyRepository } from "./drizzle-policy-repository";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

/** A copy of the migrated template without the seeded versions, so the contract starts empty. */
async function fresh() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  const session = await openSession();
  try {
    await session.db.delete(policyVersion);
  } finally {
    await session.close();
  }
  return createDrizzlePolicyRepository(openSession);
}

runPolicyRepositoryContract(fresh);

describe("the seeded versions", () => {
  it("are the first version of each document, readable through the repository", async () => {
    const database = await createTestDatabase();
    created.push(database);
    const repository = createDrizzlePolicyRepository(
      createDbSessionFactory({ connectionString: database.url }),
    );

    const conditions = await repository.latest("conditions");
    const privacy = await repository.latest("privacy");

    expect(conditions).toMatchObject({
      kind: "conditions",
      version: 1,
      publishedBy: "migration 0018",
    });
    expect(privacy).toMatchObject({ kind: "privacy", version: 1 });
    expect(conditions?.publishedAt).toBeInstanceOf(Date);
  });
});
