import { describe, expect, it } from "vitest";
import { createUnavailableService } from "./unavailable-service";

describe("createUnavailableService", () => {
  it("fails closed and is not thenable", async () => {
    const service = createUnavailableService<{ list(): Promise<unknown> }>();
    expect("then" in service).toBe(false);
    await expect(service.list()).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});
