import { describe, expect, it } from "vitest";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { inMemoryDatabaseProbe } from "~/testing/fakes/in-memory-database-probe";
import { createGetSystemStatus } from "./get-system-status";
import {
  createMemoizedDatabaseProbe,
  createProbeMemoCell,
} from "./memoized-database-probe";
import type { DatabaseProbe, DatabaseProbeResult } from "./ports";

const clock = fixedClock(new Date("2026-10-05T12:00:00Z"));

async function statusFor(probe: DatabaseProbe) {
  const result = await createGetSystemStatus({
    probe,
    clock,
    buildCommit: "abc123",
  })();
  if (!result.ok) {
    return expect.unreachable("the use case never fails");
  }
  return result.value;
}

const forResult = (result: DatabaseProbeResult) =>
  statusFor(inMemoryDatabaseProbe(result));

describe("getSystemStatus", () => {
  it("is ok when the database is reachable and migrated", async () => {
    const view = await forResult({
      reachable: true,
      latestMigration: "0000_baseline",
    });

    expect(view).toEqual({
      status: "ok",
      checks: [
        { name: "database", status: "pass" },
        { name: "migrations", status: "pass" },
      ],
      latestMigration: "0000_baseline",
      buildCommit: "abc123",
      checkedAt: "2026-10-05T12:00:00.000Z",
    });
  });

  it("is degraded when the database is unreachable", async () => {
    const view = await forResult({ reachable: false });

    expect(view.status).toBe("degraded");
    expect(view.checks).toEqual([
      { name: "database", status: "fail" },
      { name: "migrations", status: "fail" },
    ]);
    expect(view.latestMigration).toBeNull();
  });

  it("is degraded when the database has no migrations", async () => {
    const view = await forResult({ reachable: true, latestMigration: null });

    expect(view.status).toBe("degraded");
    expect(view.checks).toEqual([
      { name: "database", status: "pass" },
      { name: "migrations", status: "fail" },
    ]);
  });

  it("treats a throwing probe as unreachable without leaking its error", async () => {
    const view = await statusFor({
      probe: () =>
        Promise.reject(new Error("password=hunter2 host=db.internal")),
    });

    expect(view.status).toBe("degraded");
    expect(view.checks[0]).toEqual({ name: "database", status: "fail" });
    expect(JSON.stringify(view)).not.toMatch(/hunter2|db\.internal|password/);
  });

  it("caches nothing when the inner probe throws behind the memoized probe", async () => {
    const cell = createProbeMemoCell();
    const memoized = createMemoizedDatabaseProbe(
      {
        probe: () =>
          Promise.reject(new Error("password=hunter2 host=db.internal")),
      },
      { clock, ttlMs: 60_000, cell },
    );

    const view = await statusFor(memoized);

    expect(cell.value).toBeUndefined();
    expect(view.status).toBe("degraded");
    expect(view.latestMigration).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/hunter2|db.internal|password/);
  });
});
