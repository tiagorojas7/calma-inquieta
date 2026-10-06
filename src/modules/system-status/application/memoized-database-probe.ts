import type { Clock } from "~/modules/_shared";
import type { DatabaseProbe, DatabaseProbeResult } from "./ports";

/** Plain resolved data only: a Promise must never be shared across requests. */
export interface ProbeMemoCell {
  value?: {
    readonly result: DatabaseProbeResult;
    readonly observedAtMs: number;
  };
}

export function createProbeMemoCell(): ProbeMemoCell {
  return {};
}

export interface MemoizedDatabaseProbeOptions {
  readonly clock: Clock;
  readonly ttlMs: number;
  readonly cell: ProbeMemoCell;
}

/** Bounds database traffic: at most one inner probe per ttl per cell. */
export function createMemoizedDatabaseProbe(
  inner: DatabaseProbe,
  { clock, ttlMs, cell }: MemoizedDatabaseProbeOptions,
): DatabaseProbe {
  return {
    async probe() {
      const nowMs = clock.now().getTime();
      const cached = cell.value;
      if (cached && nowMs - cached.observedAtMs < ttlMs) {
        return cached.result;
      }
      const result = await inner.probe();
      cell.value = { result, observedAtMs: nowMs };
      return result;
    },
  };
}
