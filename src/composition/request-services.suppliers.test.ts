import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

describe("createRequestServices suppliers", () => {
  it("wires the real suppliers service, which reaches the database for an admin", async () => {
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

    // The unavailable placeholder would resolve with an "unavailable" error
    // instead of attempting the (unreachable) database.
    await expect(services.suppliers.list(testAdminActor())).rejects.toThrow();
  });
});
