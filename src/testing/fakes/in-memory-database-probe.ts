import type {
  DatabaseProbe,
  DatabaseProbeResult,
} from "~/modules/system-status/application/ports";

export interface CountingDatabaseProbe extends DatabaseProbe {
  readonly calls: number;
}

/** A probe that returns a fixed result and counts its invocations. */
export function inMemoryDatabaseProbe(
  result: DatabaseProbeResult,
): CountingDatabaseProbe {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    probe() {
      calls += 1;
      return Promise.resolve(result);
    },
  };
}
