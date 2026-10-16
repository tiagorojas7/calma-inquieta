import { describe, expect, it, vi } from "vitest";
import { loadFixture } from "~/testing/media/fixtures";
import type { R2BucketLike } from "~/platform/r2";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";
const actor = { kind: "admin-actor" as const, email: "admin@example.com" };
const file = { bytes: loadFixture("fixture.png") };

function services(mediaBucket: R2BucketLike | null) {
  return createRequestServices(
    {
      databaseUrl: UNREACHABLE_URL,
      buildCommit: "abc",
      siteUrl: "https://calma.example.test",
      indexingEnabled: false,
      mediaBucket,
    },
    {},
    createIsolateState(),
  );
}

describe("media binding in the request services", () => {
  it("answers storage-unavailable to an upload when the binding is absent", async () => {
    await expect(services(null).media.upload(actor, file)).resolves.toEqual({
      ok: false,
      error: { kind: "storage-unavailable" },
    });
  });

  it("stores through the bound bucket when it is present", async () => {
    const put = vi.fn(() => Promise.resolve({}));
    const bucket: R2BucketLike = {
      put,
      get: () => Promise.resolve(null),
      delete: () => Promise.resolve(),
    };

    // The metadata insert cannot reach the unreachable database, which is
    // fine: the object must already have been written to the bucket.
    await services(bucket)
      .media.upload(actor, file)
      .catch(() => undefined);

    expect(put).toHaveBeenCalledOnce();
  });
});
