import { ok, type Clock, type Result } from "~/modules/_shared";
import {
  overallStatus,
  type HealthCheck,
  type OverallStatus,
} from "../domain/system-status";
import type { DatabaseProbe, DatabaseProbeResult } from "./ports";

export interface SystemStatusView {
  readonly status: OverallStatus;
  readonly checks: readonly HealthCheck[];
  readonly latestMigration: string | null;
  readonly buildCommit: string;
  readonly checkedAt: string;
}

export interface GetSystemStatusDeps {
  readonly probe: DatabaseProbe;
  readonly clock: Clock;
  readonly buildCommit: string;
}

export type GetSystemStatus = () => Promise<Result<SystemStatusView, never>>;

const UNREACHABLE: DatabaseProbeResult = { reachable: false };

// A probe that throws breaches its contract; treat it as unreachable.
async function safeProbe(probe: DatabaseProbe): Promise<DatabaseProbeResult> {
  try {
    return await probe.probe();
  } catch {
    return UNREACHABLE;
  }
}

export function createGetSystemStatus(
  deps: GetSystemStatusDeps,
): GetSystemStatus {
  return async () => {
    const result = await safeProbe(deps.probe);
    const latestMigration = result.reachable ? result.latestMigration : null;
    const checks: HealthCheck[] = [
      { name: "database", status: result.reachable ? "pass" : "fail" },
      {
        name: "migrations",
        status: latestMigration === null ? "fail" : "pass",
      },
    ];
    return ok({
      status: overallStatus(checks),
      checks,
      latestMigration,
      buildCommit: deps.buildCommit,
      checkedAt: deps.clock.now().toISOString(),
    });
  };
}
