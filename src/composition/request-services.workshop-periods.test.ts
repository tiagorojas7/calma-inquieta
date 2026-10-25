import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

const services = (databaseUrl = UNREACHABLE_URL) =>
  createRequestServices(
    {
      databaseUrl,
      buildCommit: "abc",
      siteUrl: "https://calma.example.test",
      indexingEnabled: false,
      mediaBucket: null,
    },
    {},
    createIsolateState(),
  );

describe("createRequestServices workshopPeriods", () => {
  it("wires the real service, which denies before reaching the database", async () => {
    const workshopPeriods = services().workshopPeriods;
    const actorFirst = workshopPeriods as unknown as {
      list(
        actor: ReturnType<typeof testAdminActor> | null,
        workshopId: string,
      ): ReturnType<typeof workshopPeriods.list>;
    };

    await expect(actorFirst.list(null, "workshop-1")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(
      workshopPeriods.list(testAdminActor(), "workshop-1"),
    ).rejects.toThrow();
  });

  it("fails closed when no database infrastructure is configured", async () => {
    await expect(
      services("").workshopPeriods.list(testAdminActor(), "workshop-1"),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});
