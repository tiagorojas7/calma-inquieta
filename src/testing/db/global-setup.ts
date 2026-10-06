import { randomBytes } from "node:crypto";
import type { TestProject } from "vitest/node";
import { runMigrations } from "~/platform/db/migrate";
import { startPostgresServer } from "./postgres-server";
import { runAdminStatement, withDatabase } from "./test-database";

const UNUSABLE_SERVER =
  "The test database server is not usable. Check that TEST_DATABASE_URL " +
  "points to a reachable admin connection with CREATEDB, or unset it to " +
  "use the embedded PostgreSQL server.";

/**
 * Starts one PostgreSQL server per run and migrates a template database once;
 * each *.db.test.ts file then clones the template (design 8.1).
 *
 * A failure here must not skip the suite. Vitest 5 exits 0 when a globalSetup
 * throws (no test runs, no failure is reported), so the error is provided to
 * the tests instead and every database test fails with the instruction.
 */
export default async function setup(project: TestProject) {
  let server;
  try {
    server = await startPostgresServer();
  } catch (error) {
    project.provide("pg", {
      setupError: error instanceof Error ? error.message : UNUSABLE_SERVER,
    });
    return;
  }

  const template = `calma_template_${randomBytes(6).toString("hex")}`;
  try {
    await runAdminStatement(server.adminUrl, `CREATE DATABASE ${template}`);
    await runMigrations(withDatabase(server.adminUrl, template));
  } catch {
    await server.stop();
    project.provide("pg", { setupError: UNUSABLE_SERVER });
    return;
  }
  project.provide("pg", { adminUrl: server.adminUrl, template });

  const running = server;
  return async () => {
    try {
      await runAdminStatement(
        running.adminUrl,
        `DROP DATABASE IF EXISTS ${template} WITH (FORCE)`,
      );
    } finally {
      await running.stop();
    }
  };
}
