import { describe, expect, it } from "vitest";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

function servicesFor(databaseUrl: string) {
  return createRequestServices(
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
}

describe("createRequestServices intensive requests", () => {
  it("wires the real service when a database is configured", async () => {
    // A malformed public id is refused before any database access, which the
    // unavailable placeholder would answer differently.
    const result =
      await servicesFor(UNREACHABLE_URL).intensiveRequests.getRequestByPublicId(
        "short",
      );

    expect(result).toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it("answers unavailable without a database", async () => {
    const result =
      await servicesFor("").intensiveRequests.getOffer("cualquiera");

    expect(result).toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});
