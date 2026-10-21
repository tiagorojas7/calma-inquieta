import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

describe("createRequestServices intensives", () => {
  it("wires the real intensives service, reaches Drizzle for an admin, and denies an absent actor first", async () => {
    const services = createRequestServices(
      {
        databaseUrl: UNREACHABLE_URL,
        buildCommit: "abc",
        siteUrl: "https://calma.example.test",
        indexingEnabled: false,
        mediaBucket: null,
      },
      {},
      createIsolateState(),
    );

    await expect(
      services.intensives.list(testAdminActor(), { status: "live" }),
    ).rejects.toThrow();

    await expect(
      services.intensives.list(null as never, { status: "live" }),
    ).resolves.toEqual({ ok: false, error: { kind: "denied" } });
  });
});
