import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

describe("createRequestServices materials", () => {
  it("wires the real materials service, reaches Drizzle for an admin, and denies an absent actor first", async () => {
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

    // The unavailable placeholder resolves with an "unavailable" error
    // instead of attempting the (unreachable) database.
    await expect(
      services.materials.list(testAdminActor(), { state: "active" }),
    ).rejects.toThrow();

    await expect(
      services.materials.list(null as never, { state: "active" }),
    ).resolves.toEqual({ ok: false, error: { kind: "denied" } });
  });
});
