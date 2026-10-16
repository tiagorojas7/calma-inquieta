import { describe, expect, it } from "vitest";
import { createMediaService } from "./media-service";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryImageStorage } from "~/testing/fakes/in-memory-image-storage";
import { InMemoryMediaAssetRepository } from "~/testing/fakes/in-memory-media-asset-repository";
import { createUnavailableImageStorage } from "../infrastructure/unavailable-image-storage";
import { loadFixture } from "~/testing/media/fixtures";

const actor = { kind: "admin-actor" as const, email: "admin@example.com" };
const clock = fixedClock(new Date("2026-10-14T12:00:00.000Z"));
const file = { bytes: loadFixture("fixture.png") };

describe("createMediaService", () => {
  it("uploads and then serves an image over the given storage", async () => {
    const service = createMediaService({
      storage: new InMemoryImageStorage(),
      repository: new InMemoryMediaAssetRepository(),
      clock,
    });

    const uploaded = await service.upload(actor, file);
    if (!uploaded.ok) throw new Error("upload must succeed");

    const served = await service.serve(uploaded.value.fileName);
    expect(served.ok).toBe(true);
  });

  describe("without a bucket", () => {
    const service = () =>
      createMediaService({
        storage: createUnavailableImageStorage(),
        repository: new InMemoryMediaAssetRepository(),
        clock,
      });

    it("answers storage-unavailable to an upload", async () => {
      await expect(service().upload(actor, file)).resolves.toEqual({
        ok: false,
        error: { kind: "storage-unavailable" },
      });
    });

    it("answers unavailable (a 404 at the route) to a serve of a known asset", async () => {
      const repository = new InMemoryMediaAssetRepository();
      const stored = await createMediaService({
        storage: new InMemoryImageStorage(),
        repository,
        clock,
      }).upload(actor, file);
      if (!stored.ok) throw new Error("upload must succeed");

      const result = await createMediaService({
        storage: createUnavailableImageStorage(),
        repository,
        clock,
      }).serve(stored.value.fileName);

      expect(result).toEqual({ ok: false, error: { kind: "unavailable" } });
    });
  });
});
