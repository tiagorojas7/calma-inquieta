import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import { describe, expect, it, vi } from "vitest";
import {
  postgresTemplateDir,
  startPostgresServer,
  stopWithEscalation,
} from "./postgres-server";

async function showSetting(url: string, name: string): Promise<string> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ value: string }>(
      "SELECT current_setting($1) AS value",
      [name],
    );
    return rows[0]?.value ?? "";
  } finally {
    await client.end();
  }
}

async function canQuery(url: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    const { rows } = await client.query<{ one: number }>("SELECT 1 AS one");
    return rows[0]?.one === 1;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

describe("startPostgresServer", () => {
  it("returns TEST_DATABASE_URL untouched and stop is a no-op", async () => {
    const url = "postgres://admin:pw@127.0.0.1:1/override";

    const server = await startPostgresServer({ TEST_DATABASE_URL: url });

    expect(server.adminUrl).toBe(url);
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it("rejects an invalid TEST_DATABASE_URL naming only the variable", async () => {
    const secret = "secret-token-123";

    const failure = await startPostgresServer({
      TEST_DATABASE_URL: secret,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("TEST_DATABASE_URL");
    expect((failure as Error).message).not.toContain(secret);
  });

  it(
    "starts an isolated embedded server on a free port per call",
    { timeout: 240_000 },
    async () => {
      const [first, second] = await Promise.all([
        startPostgresServer({}),
        startPostgresServer({}),
      ]);
      try {
        expect(new URL(first.adminUrl).port).not.toBe(
          new URL(second.adminUrl).port,
        );
        await expect(canQuery(first.adminUrl)).resolves.toBe(true);
        await expect(canQuery(second.adminUrl)).resolves.toBe(true);
      } finally {
        await Promise.all([first.stop(), second.stop()]);
      }

      await expect(canQuery(first.adminUrl)).resolves.toBe(false);
    },
  );

  it(
    "reuses a cached pre-initialized data directory instead of running initdb",
    { timeout: 240_000 },
    async () => {
      const template = await postgresTemplateDir();
      const marker = join(template, "PG_VERSION");
      await expect(access(marker)).resolves.toBeUndefined();
      const before = await readFile(marker, "utf8");

      const second = await startPostgresServer({});
      try {
        await expect(canQuery(second.adminUrl)).resolves.toBe(true);
        // A throwaway server must stay small: many run next to the workers on
        // a machine with little free RAM.
        await expect(
          showSetting(second.adminUrl, "shared_buffers"),
        ).resolves.toBe("16MB");
        await expect(showSetting(second.adminUrl, "autovacuum")).resolves.toBe(
          "off",
        );
      } finally {
        await second.stop();
      }

      // The template is a never-started cluster: no postmaster state, and it
      // is left untouched by servers copied from it.
      await expect(access(join(template, "postmaster.pid"))).rejects.toThrow();
      await expect(readFile(marker, "utf8")).resolves.toBe(before);
    },
  );

  it(
    "keeps the exit code of the process that loads embedded-postgres",
    // Spawning node with tsx is slow while other workers run; the child has
    // its own 30 s limit below.
    { timeout: 60_000 },
    () => {
      // embedded-postgres registers a beforeExit hook at import time that calls
      // process.exit(0), which would turn a failed test run into a green one.
      const run = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          `const { loadEmbeddedPostgres } = await import("~/testing/db/postgres-server");
  await loadEmbeddedPostgres();
  process.exitCode = 3;`,
        ],
        { encoding: "utf8", timeout: 30_000 },
      );

      expect(run.stderr).toBe("");
      expect(run.status).toBe(3);
    },
  );
});

describe("stopWithEscalation", () => {
  it("does not escalate when the stop finishes in time", async () => {
    const escalate = vi.fn();

    await stopWithEscalation(() => Promise.resolve(), escalate, 1_000);

    expect(escalate).not.toHaveBeenCalled();
  });

  it("escalates repeatedly until a stuck stop completes", async () => {
    // On Windows the library kills the process tree and can leave the
    // postmaster alive, so its stop() waits for an exit that never comes.
    let release = () => {};
    const stuck = new Promise<void>((resolve) => {
      release = resolve;
    });
    const escalate = vi.fn(() => {
      if (escalate.mock.calls.length === 2) {
        release();
      }
    });

    await stopWithEscalation(() => stuck, escalate, 10);

    expect(escalate).toHaveBeenCalledTimes(2);
  });

  it("propagates a stop failure and stops escalating", async () => {
    const escalate = vi.fn();

    await expect(
      stopWithEscalation(() => Promise.reject(new Error("boom")), escalate, 5),
    ).rejects.toThrow("boom");
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(escalate).not.toHaveBeenCalled();
  });
});
