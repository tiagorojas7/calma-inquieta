import { describe, expect, it } from "vitest";
import type { DatabaseProbeResult } from "~/modules/system-status/application/ports";
import {
  runDatabaseProbeContract,
  type ProbeScenario,
} from "../contracts/database-probe.contract";
import { inMemoryDatabaseProbe } from "./in-memory-database-probe";

const results: Record<ProbeScenario, DatabaseProbeResult> = {
  migrated: {
    reachable: true,
    latestMigration: "0017_material_price_on_request",
  },
  empty: { reachable: true, latestMigration: null },
  unreachable: { reachable: false },
};

runDatabaseProbeContract((scenario) =>
  Promise.resolve(inMemoryDatabaseProbe(results[scenario])),
);

describe("inMemoryDatabaseProbe", () => {
  it("counts how many times it was probed", async () => {
    const probe = inMemoryDatabaseProbe({ reachable: false });

    await probe.probe();
    await probe.probe();

    expect(probe.calls).toBe(2);
  });
});
