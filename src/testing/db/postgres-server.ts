import { mkdtemp, rm } from "node:fs/promises";
import { type ChildProcess, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cpSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatEnvError, parseEnv, testEnvSchema } from "~/platform/env";
import {
  embeddedPostgresVersion,
  ensureDataDirTemplate,
  templateKey,
} from "./data-dir-template";

export interface PostgresServer {
  /** Connection string of a role that can CREATE DATABASE. */
  readonly adminUrl: string;
  stop(): Promise<void>;
}

const ADMIN_USER = "postgres";
const ADMIN_PASSWORD = "password";
// Windows keeps file handles briefly after postgres exits (more so on a busy
// machine). The directory lives in the OS temp folder, so a removal that still
// fails after the retries is ignored rather than failing the run.
const INITDB_FLAGS = ["--encoding=UTF8", "--locale=C", "--wal-segsize=1"];
const TEMPLATE_ROOT = join(tmpdir(), "calma-pg-template");
const REMOVE_OPTIONS = {
  recursive: true,
  force: true,
  maxRetries: 10,
  retryDelay: 200,
};

/**
 * Loads embedded-postgres without its import-time exit hooks. The library
 * registers `beforeExit` and `exit` listeners at import: the first calls
 * process.exit(0) and discards process.exitCode (a failed Vitest run would turn
 * green) and the second throws because it expects an async callback. The server
 * is stopped by the global teardown instead.
 */
export async function loadEmbeddedPostgres() {
  const beforeExitBefore = new Set(process.listeners("beforeExit"));
  const exitBefore = new Set(process.listeners("exit"));
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  for (const listener of process.listeners("beforeExit")) {
    if (!beforeExitBefore.has(listener)) {
      process.removeListener("beforeExit", listener);
    }
  }
  for (const listener of process.listeners("exit")) {
    if (!exitBefore.has(listener)) {
      process.removeListener("exit", listener);
    }
  }
  return EmbeddedPostgres;
}

function removeQuietly(directory: string): Promise<void> {
  return rm(directory, REMOVE_OPTIONS).catch(() => undefined);
}

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

function serverOptions(databaseDir: string, port: number) {
  return {
    databaseDir,
    port,
    user: ADMIN_USER,
    password: ADMIN_PASSWORD,
    // The library deletes the directory itself when not persistent, without
    // retries; Windows can still hold handles, so removal is done by the caller.
    persistent: true,
    initdbFlags: INITDB_FLAGS,
    postgresFlags: [
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
      "-c",
      "timezone=UTC",
      // Throwaway servers share a small machine with the test workers.
      "-c",
      "shared_buffers=16MB",
      "-c",
      "max_connections=50",
      "-c",
      "autovacuum=off",
    ],
    onLog: () => undefined,
    onError: () => undefined,
  };
}

let template: Promise<string> | undefined;

/**
 * A never-started, initdb-initialized data directory shared by every embedded
 * server on this machine: copying it replaces a slow `initdb` per server. It
 * is cached in the OS temp folder (safe to delete) and shared in-process so
 * concurrent starts build it once.
 */
export function postgresTemplateDir(): Promise<string> {
  template ??= (async () => {
    const key = templateKey(await embeddedPostgresVersion(), INITDB_FLAGS);
    return ensureDataDirTemplate({
      root: TEMPLATE_ROOT,
      key,
      build: async (directory) => {
        const EmbeddedPostgres = await loadEmbeddedPostgres();
        await new EmbeddedPostgres(serverOptions(directory, 0)).initialise();
      },
    });
  })();
  // A failed build is retried by the next call instead of being cached.
  template.catch(() => {
    template = undefined;
  });
  return template;
}

const FORCE_KILL_INTERVAL_MS = 10_000;

/**
 * Runs `stop` and calls `escalate` every `intervalMs` until it settles, so a
 * kill that did not take effect is repeated instead of waiting forever for an
 * exit that never comes (a hang until the test timeout).
 */
export async function stopWithEscalation(
  stop: () => Promise<void>,
  escalate: () => void,
  intervalMs: number = FORCE_KILL_INTERVAL_MS,
): Promise<void> {
  const timer = setInterval(escalate, intervalMs);
  try {
    await stop();
  } finally {
    clearInterval(timer);
  }
}

/**
 * Kills only the postmaster. `taskkill /t` (what embedded-postgres uses) kills
 * the children too, in an unspecified order; the postmaster can then restart
 * them for crash recovery and be killed mid-restart, leaving orphans that hold
 * the data directory and the inherited output pipes. Without `/t` the
 * children notice the postmaster is gone and exit by themselves.
 */
function killPostmaster(pid: number): void {
  spawnSync("taskkill", ["/pid", String(pid), "/f"], { stdio: "ignore" });
}

type Embedded = InstanceType<Awaited<ReturnType<typeof loadEmbeddedPostgres>>>;

async function stopServer(server: Embedded): Promise<void> {
  // embedded-postgres keeps the postmaster handle private. Other platforms
  // keep its own SIGINT shutdown, which is graceful.
  const child = (server as unknown as { process?: ChildProcess }).process;
  if (
    process.platform !== "win32" ||
    child?.pid === undefined ||
    child.exitCode !== null
  ) {
    await server.stop();
    return;
  }
  const { pid } = child;
  const exited = once(child, "exit").then(() => undefined);
  killPostmaster(pid);
  await stopWithEscalation(
    () => exited,
    () => {
      killPostmaster(pid);
    },
  );
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
  const EmbeddedPostgres = await loadEmbeddedPostgres();
  const server = new EmbeddedPostgres(serverOptions(databaseDir, port));
  try {
    cpSync(await postgresTemplateDir(), databaseDir, { recursive: true });
    await server.start();
  } catch (error) {
    await removeQuietly(databaseDir);
    throw new Error(
      "Could not start the embedded PostgreSQL server. Set TEST_DATABASE_URL " +
        "to an admin connection string (for example WSL2 PostgreSQL) to use an external server.",
      { cause: error },
    );
  }

  return {
    adminUrl: `postgres://${ADMIN_USER}:${ADMIN_PASSWORD}@127.0.0.1:${String(port)}/postgres`,
    async stop() {
      await stopServer(server);
      await removeQuietly(databaseDir);
    },
  };
}
