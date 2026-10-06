export type CheckStatus = "pass" | "fail";

export interface HealthCheck {
  readonly name: "database" | "migrations";
  readonly status: CheckStatus;
}

export type OverallStatus = "ok" | "degraded";

/** ok only when there is at least one check and every check passes. */
export function overallStatus(checks: readonly HealthCheck[]): OverallStatus {
  return checks.length > 0 && checks.every((c) => c.status === "pass")
    ? "ok"
    : "degraded";
}
