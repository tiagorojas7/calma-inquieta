import { describe, expect, it } from "vitest";
import type { DatabaseProbe } from "~/modules/system-status/application/ports";

export type ProbeScenario = "migrated" | "empty" | "unreachable";

/** Behavior every DatabaseProbe implementation must satisfy. */
export function runDatabaseProbeContract(
  createProbe: (scenario: ProbeScenario) => Promise<DatabaseProbe>,
): void {
  describe("DatabaseProbe contract", () => {
    it("reports the latest migration of a migrated database", async () => {
      const probe = await createProbe("migrated");

      await expect(probe.probe()).resolves.toEqual({
        reachable: true,
        latestMigration: "0006_workshop_turnos",
      });
    });

    it("reports a reachable database without migrations", async () => {
      const probe = await createProbe("empty");

      await expect(probe.probe()).resolves.toEqual({
        reachable: true,
        latestMigration: null,
      });
    });

    it("reports an unreachable database without throwing", async () => {
      const probe = await createProbe("unreachable");

      await expect(probe.probe()).resolves.toEqual({ reachable: false });
    });
  });
}
