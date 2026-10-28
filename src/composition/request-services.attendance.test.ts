import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

describe("createRequestServices attendance", () => {
  it("wires the real attendance service, which reaches the database for an admin", async () => {
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
    await expect(
      services.attendance.listTurnos(testAdminActor()),
    ).rejects.toThrow();
  });

  it("denies a request without an admin actor before any database call", async () => {
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

    await expect(services.attendance.listTurnos(null)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });
});
