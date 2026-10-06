import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { formatEnvError, parseEnv, testEnvSchema } from "~/platform/env";

export interface PostgresServer {
  /** Connection string of a role that can CREATE DATABASE. */
  readonly adminUrl: string;
  stop(): Promise<void>;
}

const ADMIN_USER = "postgres";
const ADMIN_PASSWORD = "password";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" ? address?.port : undefined;
      probe.close(() => {
        if (port === undefined) {
          reject(new Error("could not reserve a free port"));
        } else {
          resolve(port);
        }
      });
    });
  });
}

/**
 * `TEST_DATABASE_URL` (an admin URL with CREATEDB, for example WSL2 Postgres)
 * replaces the embedded server. Otherwise a throwaway PostgreSQL 17 cluster
 * starts on a free port in a temp directory (design D5, section 8.1).
 */
export async function startPostgresServer(
  env: Readonly<Record<string, unknown>> = process.env,
): Promise<PostgresServer> {
  const parsed = parseEnv(testEnvSchema, env);
  if (!parsed.ok) {
    throw new Error(formatEnvError(parsed.error));
  }
  const override = parsed.value.TEST_DATABASE_URL;
  if (override !== undefined) {
    return { adminUrl: override, stop: () => Promise.resolve() };
  }

  const port = await freePort();
  const databaseDir = await mkdtemp(join(tmpdir(), "calma-pg-"));
  const server = new EmbeddedPostgres({
    databaseDir,
    port,
    user: ADMIN_USER,
    password: ADMIN_PASSWORD,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: [
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
      "-c",
      "timezone=UTC",
    ],
    onLog: () => undefined,
    onError: () => undefined,
  });
  try {
    await server.initialise();
    await server.start();
  } catch (error) {
    await rm(databaseDir, { recursive: true, force: true });
    throw new Error(
      "Could not start the embedded PostgreSQL server. Set TEST_DATABASE_URL " +
        "to an admin connection string (for example WSL2 PostgreSQL) to use an external server.",
      { cause: error },
    );
  }

  return {
    adminUrl: `postgres://${ADMIN_USER}:${ADMIN_PASSWORD}@127.0.0.1:${String(port)}/postgres`,
    async stop() {
      await server.stop();
      await rm(databaseDir, { recursive: true, force: true });
    },
  };
}
