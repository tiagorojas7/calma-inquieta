import { describe, expect, it } from "vitest";
import { immutableImageHeaders } from "./read-models";
import { serveImage } from "./serve";
import { uploadImage } from "./upload";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryImageStorage } from "~/testing/fakes/in-memory-image-storage";
import { InMemoryMediaAssetRepository } from "~/testing/fakes/in-memory-media-asset-repository";
import { loadFixture } from "~/testing/media/fixtures";

const actor = { kind: "admin-actor" as const, email: "admin@example.com" };
const clock = fixedClock(new Date("2026-10-14T12:00:00.000Z"));

async function setupWithUpload() {
  const storage = new InMemoryImageStorage();
  const repo = new InMemoryMediaAssetRepository();
  const bytes = loadFixture("fixture.webp");
  const uploaded = await uploadImage(
    actor,
    { read: () => Promise.resolve(bytes) },
    storage,
    repo,
    clock,
  );
  if (!uploaded.ok) throw new Error("fixture upload must succeed");
  return {
    storage,
    repo,
    bytes,
    asset: uploaded.value,
    serve: (fileName: string) => serveImage(fileName, storage, repo),
  };
}

describe("serveImage", () => {
  it("serves the stored bytes with the detected type, size and a stable etag", async () => {
    const { serve, asset, bytes } = await setupWithUpload();

    const result = await serve(asset.fileName);

    if (!result.ok) throw new Error("expected a served image");
    expect(result.value.contentType).toBe("image/webp");
    expect(result.value.byteSize).toBe(bytes.byteLength);
    expect(result.value.etag).toBe(`"${asset.id}"`);
    const body = new Uint8Array(
      await new Response(result.value.body).arrayBuffer(),
    );
    expect(body).toEqual(bytes);
  });

  it("produces the content type used by the immutable response headers", async () => {
    const { serve, asset } = await setupWithUpload();

    const result = await serve(asset.fileName);

    if (!result.ok) throw new Error("expected a served image");
    expect(
      immutableImageHeaders(result.value.contentType)["Content-Type"],
    ).toBe("image/webp");
  });

  it("reports not-found for an unknown file name without touching storage", async () => {
    const { serve, storage } = await setupWithUpload();
    let reads = 0;
    const original = storage.get.bind(storage);
    storage.get = (key) => {
      reads++;
      return original(key);
    };

    const result = await serve("0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01.webp");

    expect(result).toEqual({ ok: false, error: { kind: "not-found" } });
    expect(reads).toBe(0);
  });

  it("reports not-found when the extension does not match the stored type", async () => {
    const { serve, asset } = await setupWithUpload();

    const result = await serve(asset.fileName.replace(".webp", ".png"));

    expect(result).toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it.each([
    "",
    "photo.jpg",
    "../etc/passwd",
    "img/0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01.webp",
    "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01.gif",
    "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01.WEBP",
    "------------------------------------.png",
  ])(
    "reports not-found for the malformed name %j without any lookup",
    async (name) => {
      const { serve, repo } = await setupWithUpload();
      let lookups = 0;
      repo.findByIds = () => {
        lookups++;
        return Promise.resolve(new Map());
      };

      const result = await serve(name);

      expect(result).toEqual({ ok: false, error: { kind: "not-found" } });
      expect(lookups).toBe(0);
    },
  );

  it("reports not-found when the row exists but the object is missing", async () => {
    const { serve, asset, storage } = await setupWithUpload();
    await storage.delete(`img/${asset.fileName}`);

    expect(await serve(asset.fileName)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("reports unavailable when storage fails", async () => {
    const { serve, asset, storage } = await setupWithUpload();
    storage.failGet = true;

    expect(await serve(asset.fileName)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  it("reports unavailable when the metadata lookup fails", async () => {
    const { serve, asset, repo } = await setupWithUpload();
    repo.findByIds = () => Promise.reject(new Error("db down"));

    expect(await serve(asset.fileName)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});
