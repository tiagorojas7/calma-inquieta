import { randomBytes } from "node:crypto";
import pg from "pg";
import { inject } from "vitest";

declare module "vitest" {
  interface ProvidedContext {
    pg: { adminUrl: string; template: string };
  }
}

export interface TestDatabase {
  readonly name: string;
  readonly url: string;
  /** Idempotent: drops the database, terminating any open connection. */
  drop(): Promise<void>;
}

export function withDatabase(adminUrl: string, database: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

/** Runs one statement on the admin database, always closing the client. */
export async function runAdminStatement(
  adminUrl: string,
  statement: string,
): Promise<void> {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}

/**
 * Clones the migrated template into a database owned by one test file, or an
 * empty database (cloned from template0) when `{ empty: true }` (design 8.1).
 */
export async function createTestDatabase(
  options: { empty?: boolean } = {},
): Promise<TestDatabase> {
  const { adminUrl, template } = inject("pg");
  const name = `t_${randomBytes(6).toString("hex")}`;
  const source = options.empty === true ? "template0" : template;
  await runAdminStatement(
    adminUrl,
    `CREATE DATABASE ${name} TEMPLATE ${source}`,
  );
  return {
    name,
    url: withDatabase(adminUrl, name),
    drop: () =>
      runAdminStatement(
        adminUrl,
        `DROP DATABASE IF EXISTS ${name} WITH (FORCE)`,
      ),
  };
}
