import {
  createGetSystemStatus,
  createMemoizedDatabaseProbe,
  createProbeMemoCell,
  type GetSystemStatus,
  type ProbeMemoCell,
} from "~/modules/system-status";
import { createDrizzleDatabaseProbe } from "~/modules/system-status/infrastructure/drizzle-database-probe";
import { createDbSessionFactory } from "~/platform/db/session";
import { systemClock } from "~/platform/system-clock";

/** How long `/status` reuses the last database probe (design D12). */
const STATUS_PROBE_TTL_MS = 60_000;

export interface AppServices {
  readonly getSystemStatus: GetSystemStatus;
}

export interface RuntimeConfig {
  readonly databaseUrl: string;
  readonly buildCommit: string;
}

/** State that lives as long as the isolate and is shared by its requests. */
export interface IsolateState {
  readonly statusProbeMemo: ProbeMemoCell;
}

export function createIsolateState(): IsolateState {
  return { statusProbeMemo: createProbeMemoCell() };
}

/**
 * The only place adapters are instantiated (design 5.2). Built per request,
 * so connections stay request-scoped; only `isolate` outlives the request.
 */
export function createRequestServices(
  config: RuntimeConfig,
  runtime: { defer?: (pending: Promise<unknown>) => void },
  isolate: IsolateState,
): AppServices {
  const openSession = createDbSessionFactory({
    connectionString: config.databaseUrl,
    ...(runtime.defer ? { defer: runtime.defer } : {}),
  });
  const probe = createMemoizedDatabaseProbe(
    createDrizzleDatabaseProbe(openSession),
    {
      clock: systemClock,
      ttlMs: STATUS_PROBE_TTL_MS,
      cell: isolate.statusProbeMemo,
    },
  );
  return {
    getSystemStatus: createGetSystemStatus({
      probe,
      clock: systemClock,
      buildCommit: config.buildCommit,
    }),
  };
}
