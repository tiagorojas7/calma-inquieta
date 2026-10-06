import { describe, expect, it } from "vitest";
import { overallStatus, type HealthCheck } from "./system-status";

const pass = (name: HealthCheck["name"]): HealthCheck => ({
  name,
  status: "pass",
});
const fail = (name: HealthCheck["name"]): HealthCheck => ({
  name,
  status: "fail",
});

describe("overallStatus", () => {
  it("is ok when every check passes", () => {
    expect(overallStatus([pass("database"), pass("migrations")])).toBe("ok");
  });

  it("is degraded when any check fails", () => {
    expect(overallStatus([pass("database"), fail("migrations")])).toBe(
      "degraded",
    );
    expect(overallStatus([fail("database"), fail("migrations")])).toBe(
      "degraded",
    );
  });

  it("is degraded when there are no checks at all", () => {
    expect(overallStatus([])).toBe("degraded");
  });
});
