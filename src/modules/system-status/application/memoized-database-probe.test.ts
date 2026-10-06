import { describe, expect, it } from "vitest";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { inMemoryDatabaseProbe } from "~/testing/fakes/in-memory-database-probe";
import {
  createMemoizedDatabaseProbe,
  createProbeMemoCell,
} from "./memoized-database-probe";
import type { DatabaseProbeResult } from "./ports";

const START = new Date("2026-10-05T12:00:00Z");
const TTL_MS = 60_000;

function setup(inner: DatabaseProbeResult) {
  const clock = advancingClock(START);
  const counting = inMemoryDatabaseProbe(inner);
  const cell = createProbeMemoCell();
  const probe = createMemoizedDatabaseProbe(counting, {
    clock,
    ttlMs: TTL_MS,
    cell,
  });
  return { clock, counting, cell, probe };
}

describe("createMemoizedDatabaseProbe", () => {
  it("delegates on the first call", async () => {
    const { probe, counting } = setup({
      reachable: true,
      latestMigration: "0000_baseline",
    });

    await expect(probe.probe()).resolves.toEqual({
      reachable: true,
      latestMigration: "0000_baseline",
    });
    expect(counting.calls).toBe(1);
  });

  it("serves the cached result within the ttl", async () => {
    const { probe, counting, clock } = setup({
      reachable: true,
      latestMigration: "0000_baseline",
    });

    await probe.probe();
    clock.advance(TTL_MS - 1);
    const second = await probe.probe();

    expect(counting.calls).toBe(1);
    expect(second).toEqual({
      reachable: true,
      latestMigration: "0000_baseline",
    });
  });

  it("delegates again at exactly the ttl", async () => {
    const { probe, counting, clock } = setup({ reachable: false });

    await probe.probe();
    clock.advance(TTL_MS);
    await probe.probe();

    expect(counting.calls).toBe(2);
  });

  it("memoizes degraded results the same way", async () => {
    const { probe, counting, clock } = setup({ reachable: false });

    await probe.probe();
    clock.advance(1_000);
    const second = await probe.probe();

    expect(counting.calls).toBe(1);
    expect(second).toEqual({ reachable: false });
  });

  it("stores plain data only, never a promise", async () => {
    const { probe, cell } = setup({ reachable: false });

    expect(cell.value).toBeUndefined();
    await probe.probe();

    expect(cell.value).toEqual({
      result: { reachable: false },
      observedAtMs: START.getTime(),
    });
    expect(cell.value).not.toBeInstanceOf(Promise);
  });
});
