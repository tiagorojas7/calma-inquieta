import { randomBytes } from "node:crypto";
import type { TestProject } from "vitest/node";
import { runMigrations } from "~/platform/db/migrate";
import { startPostgresServer } from "./postgres-server";
import { runAdminStatement, withDatabase } from "./test-database";

/**
 * Starts one PostgreSQL server per run and migrates a template database once;
 * each *.db.test.ts file then clones the template (design 8.1). Any failure
 * here fails the whole run: the database suite never skips silently.
 */
export default async function setup(project: TestProject) {
  const server = await startPostgresServer();
  const template = `calma_template_${randomBytes(6).toString("hex")}`;
  try {
    await runAdminStatement(server.adminUrl, `CREATE DATABASE ${template}`);
    await runMigrations(withDatabase(server.adminUrl, template));
  } catch (error) {
    await server.stop();
    throw error;
  }
  project.provide("pg", { adminUrl: server.adminUrl, template });

  return async () => {
    try {
      await runAdminStatement(
        server.adminUrl,
        `DROP DATABASE IF EXISTS ${template} WITH (FORCE)`,
      );
    } finally {
      await server.stop();
    }
  };
}
