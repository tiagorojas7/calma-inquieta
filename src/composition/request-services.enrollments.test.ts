import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

const services = () =>
  createRequestServices(
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

describe("createRequestServices enrollments", () => {
  it("fails closed through the unavailable admin enrollment service", async () => {
    await expect(
      services().enrollments.list(testAdminActor()),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  it("preserves per-order outcomes when unavailable bulk materials are requested", async () => {
    await expect(
      services().enrollments.markMaterialsRequestedBulk(testAdminActor(), [
        "order-1",
        "order-2",
      ]),
    ).resolves.toEqual([
      {
        orderId: "order-1",
        result: { ok: false, error: { kind: "unavailable" } },
      },
      {
        orderId: "order-2",
        result: { ok: false, error: { kind: "unavailable" } },
      },
    ]);
  });
});
