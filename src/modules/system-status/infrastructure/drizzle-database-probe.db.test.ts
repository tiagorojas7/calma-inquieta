import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import type { DbSession, DbSessionFactory } from "~/platform/db/session";
import {
  runDatabaseProbeContract,
  type ProbeScenario,
} from "~/testing/contracts/database-probe.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleDatabaseProbe } from "./drizzle-database-probe";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function urlFor(scenario: ProbeScenario): Promise<string> {
  if (scenario === "unreachable") {
    return UNREACHABLE_URL;
  }
  const database = await createTestDatabase({ empty: scenario === "empty" });
  created.push(database);
  return database.url;
}

const factoryFor = (connectionString: string) =>
  createDbSessionFactory({ connectionString, connectTimeoutMs: 1_000 });

runDatabaseProbeContract(async (scenario) =>
  createDrizzleDatabaseProbe(factoryFor(await urlFor(scenario))),
);

describe("createDrizzleDatabaseProbe session handling", () => {
  function tracked(open: DbSessionFactory) {
    const state = { opened: 0, closed: 0 };
    const factory: DbSessionFactory = async () => {
      const session: DbSession = await open();
      state.opened += 1;
      return {
        db: session.db,
        close: () => {
          state.closed += 1;
          return session.close();
        },
      };
    };
    return { state, factory };
  }

  it.each(["migrated", "empty"] as const)(
    "closes the session after probing a %s database",
    async (scenario) => {
      const { state, factory } = tracked(factoryFor(await urlFor(scenario)));

      await createDrizzleDatabaseProbe(factory).probe();

      expect(state).toEqual({ opened: 1, closed: 1 });
    },
  );

  it("reports unreachable when the query fails for another reason", async () => {
    const url = await urlFor("empty");
    const { state, factory } = tracked(factoryFor(url));
    // A migrations table with the wrong shape makes the SELECT fail with a
    // different error than undefined_table.
    const setup = await factory();
    await setup.db.execute(sql`CREATE SCHEMA drizzle`);
    await setup.db.execute(
      sql`CREATE TABLE drizzle.__drizzle_migrations (id integer)`,
    );
    await setup.close();

    const result = await createDrizzleDatabaseProbe(factory).probe();

    expect(result).toEqual({ reachable: false });
    expect(state.closed).toBe(state.opened);
  });
});
