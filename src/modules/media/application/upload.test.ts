import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES } from "../domain/media-core";
import { immutableImageHeaders } from "./read-models";
import { uploadImage, type ImageByteSource } from "./upload";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryImageStorage } from "~/testing/fakes/in-memory-image-storage";
import { InMemoryMediaAssetRepository } from "~/testing/fakes/in-memory-media-asset-repository";
import { buildJpeg, buildPng, buildWebp } from "~/testing/media/builders";
import { loadFixture, nonImageSamples, padTo } from "~/testing/media/fixtures";

const actor = { kind: "admin-actor" as const, email: "admin@example.com" };
const clock = fixedClock(new Date("2026-10-13T12:00:00.000Z"));
const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const sourceOf = (bytes: Uint8Array): ImageByteSource => ({
  read: () => Promise.resolve(bytes),
});

function setup() {
  const storage = new InMemoryImageStorage();
  const repo = new InMemoryMediaAssetRepository();
  return {
    storage,
    repo,
    upload: (source: ImageByteSource) =>
      uploadImage(actor, source, storage, repo, clock),
  };
}

describe("uploadImage", () => {
  it("checks authorization before reading bytes or storage", async () => {
    let reads = 0;
    const source: ImageByteSource = {
      read: () => {
        reads++;
        return Promise.resolve(new Uint8Array());
      },
    };
    const { storage, repo, upload } = setup();
    await expect(
      uploadImage(null, source, storage, repo, clock),
    ).resolves.toMatchObject({ ok: false, error: { kind: "denied" } });
    expect(reads).toBe(0);
    expect(storage.putCalls).toHaveLength(0);
    expect(repo.insertCalls).toBe(0);
    await expect(upload(source)).resolves.toEqual({
      ok: false,
      error: { kind: "empty" },
    });
    expect(reads).toBe(1);
  });

  describe("accepted images", () => {
    it.each([
      ["fixture.jpg", "image/jpeg", "jpg", 7, 5],
      ["fixture-progressive.jpg", "image/jpeg", "jpg", 9, 4],
      ["fixture.png", "image/png", "png", 7, 5],
      ["fixture.webp", "image/webp", "webp", 7, 5],
      ["fixture-lossless.webp", "image/webp", "webp", 6, 3],
      ["fixture-extended.webp", "image/webp", "webp", 8, 2],
    ] as const)(
      "persists the metadata of %s",
      async (name, contentType, extension, width, height) => {
        const bytes = loadFixture(name);
        const { repo, upload } = setup();
        const result = await upload(sourceOf(bytes));
        if (!result.ok) throw new Error("expected the upload to succeed");
        const asset = result.value;
        expect(asset.id).toMatch(new RegExp(`^${UUID}$`));
        expect(asset).toEqual({
          id: asset.id,
          fileName: `${asset.id}.${extension}`,
          src: `/imagenes/${asset.id}.${extension}`,
          contentType,
          byteSize: bytes.byteLength,
          width,
          height,
          createdBy: actor.email,
          createdAt: clock.now(),
        });
        expect(repo.assets.size).toBe(1);
        expect(repo.assets.get(asset.id)).toEqual(asset);
      },
    );

    it("passes the detected type, the untouched bytes and a random key to storage", async () => {
      const bytes = loadFixture("fixture.webp");
      const { storage, upload } = setup();
      const result = await upload(sourceOf(bytes));
      if (!result.ok) throw new Error("expected the upload to succeed");
      expect(storage.putCalls).toHaveLength(1);
      const [call] = storage.putCalls;
      expect(call?.key).toMatch(new RegExp(`^img/${UUID}\\.webp$`));
      expect(call?.key).toBe(`img/${result.value.fileName}`);
      expect(call?.contentType).toBe("image/webp");
      expect(call?.bytes).toEqual(bytes);
      await expect(storage.get(call?.key ?? "")).resolves.toEqual({
        bytes,
        contentType: "image/webp",
      });
    });

    it("decides by bytes only: a WebP named .jpg and declared image/png is stored as image/webp", async () => {
      const bytes = loadFixture("fixture.webp");
      const { storage, repo, upload } = setup();
      const source = {
        read: () => Promise.resolve(bytes),
        name: "Mi Foto Privada.jpg",
        type: "image/png",
      };
      const result = await upload(source);
      if (!result.ok) throw new Error("expected the upload to succeed");
      expect(result.value.contentType).toBe("image/webp");
      expect(repo.assets.get(result.value.id)?.contentType).toBe("image/webp");
      expect(storage.putCalls[0]?.contentType).toBe("image/webp");
      const key = storage.putCalls[0]?.key ?? "";
      expect(key.endsWith(".webp")).toBe(true);
      for (const part of ["Mi", "Foto", "Privada", ".jpg", "png"])
        expect(key).not.toContain(part);
    });

    it("gives two uploads of the same name and bytes distinct keys and overwrites nothing", async () => {
      const bytes = loadFixture("fixture.png");
      const { storage, repo, upload } = setup();
      const named = { read: () => Promise.resolve(bytes), name: "foto.png" };
      const first = await upload(named);
      const second = await upload(named);
      if (!first.ok || !second.ok) throw new Error("expected both to succeed");
      expect(second.value.id).not.toBe(first.value.id);
      expect(second.value.fileName).not.toBe(first.value.fileName);
      expect(storage.keys).toHaveLength(2);
      expect(repo.assets.size).toBe(2);
    });

    it("builds the serving read model from the detected type", async () => {
      const { storage, upload } = setup();
      const result = await upload(sourceOf(loadFixture("fixture.webp")));
      if (!result.ok) throw new Error("expected the upload to succeed");
      const asset = result.value;
      expect(asset.fileName).toMatch(/^[0-9a-f-]{36}\.(jpg|png|webp)$/);
      expect(asset.src).toBe(`/imagenes/${asset.fileName}`);
      expect(immutableImageHeaders(asset.contentType)["Content-Type"]).toBe(
        "image/webp",
      );
      const stored = await storage.get(`img/${asset.fileName}`);
      expect(stored?.contentType).toBe(asset.contentType);
    });
  });

  describe("rejections store nothing", () => {
    const expectNothingStored = (
      storage: InMemoryImageStorage,
      repo: InMemoryMediaAssetRepository,
    ) => {
      expect(storage.putCalls).toHaveLength(0);
      expect(storage.deleteCalls).toHaveLength(0);
      expect(repo.insertCalls).toBe(0);
    };

    it.each(nonImageSamples)(
      "%s is an unsupported type",
      async (_name, bytes) => {
        const { storage, repo, upload } = setup();
        await expect(upload(sourceOf(bytes))).resolves.toEqual({
          ok: false,
          error: { kind: "unsupported-type" },
        });
        expectNothingStored(storage, repo);
      },
    );

    it.each([
      [
        "PNG signature without a header",
        loadFixture("fixture.png").slice(0, 8),
      ],
      ["PNG wider than 10000", buildPng(10001, 5)],
      ["PNG with zero height", buildPng(5, 0)],
      ["JPEG signature only", Uint8Array.from([0xff, 0xd8, 0xff])],
      ["JPEG taller than 10000", buildJpeg(5, 10001)],
      ["WebP lossy wider than 10000", buildWebp("lossy", 10001, 5)],
      ["WebP lossless taller than 10000", buildWebp("lossless", 5, 10001)],
    ] as const)("%s has unreadable dimensions", async (_name, bytes) => {
      const { storage, repo, upload } = setup();
      await expect(upload(sourceOf(bytes))).resolves.toEqual({
        ok: false,
        error: { kind: "unreadable-dimensions" },
      });
      expectNothingStored(storage, repo);
    });

    it("ignores a declared image type on bytes that are not an image", async () => {
      const { storage, repo, upload } = setup();
      const html = nonImageSamples.find(([name]) => name.startsWith("HTML"));
      const source = {
        read: () => Promise.resolve(html?.[1] ?? new Uint8Array()),
        name: "photo.jpg",
        type: "image/jpeg",
      };
      await expect(upload(source)).resolves.toEqual({
        ok: false,
        error: { kind: "unsupported-type" },
      });
      expectNothingStored(storage, repo);
    });
  });

  describe("size limit", () => {
    it.each([
      ["fixture.jpg", "image/jpeg"],
      ["fixture.png", "image/png"],
      ["fixture.webp", "image/webp"],
    ])(
      "accepts %s padded to exactly the limit and keeps its size",
      async (name, contentType) => {
        const { storage, repo, upload } = setup();
        const stored = await upload(
          sourceOf(padTo(loadFixture(name), MAX_IMAGE_BYTES)),
        );
        expect(stored.ok && stored.value).toMatchObject({
          contentType,
          byteSize: MAX_IMAGE_BYTES,
          width: 7,
          height: 5,
        });
        expect(storage.putCalls).toHaveLength(1);
        expect(repo.assets.size).toBe(1);
      },
    );

    it.each([["fixture.jpg"], ["fixture.png"], ["fixture.webp"]])(
      "rejects %s one byte over the limit, naming the limit and storing nothing",
      async (name) => {
        const { storage, repo, upload } = setup();
        await expect(
          upload(sourceOf(padTo(loadFixture(name), MAX_IMAGE_BYTES + 1))),
        ).resolves.toEqual({
          ok: false,
          error: { kind: "too-large", limitBytes: MAX_IMAGE_BYTES },
        });
        expect(storage.putCalls).toHaveLength(0);
        expect(repo.insertCalls).toBe(0);
      },
    );

    it("rejects a zero-byte file and stores nothing", async () => {
      const { storage, repo, upload } = setup();
      await expect(upload(sourceOf(new Uint8Array()))).resolves.toEqual({
        ok: false,
        error: { kind: "empty" },
      });
      expect(storage.putCalls).toHaveLength(0);
      expect(repo.insertCalls).toBe(0);
    });
  });

  describe("cleanup after a failure", () => {
    const png = () => sourceOf(loadFixture("fixture.png"));

    it("removes the stored object and rethrows the insert error when metadata insert fails", async () => {
      const { storage, repo, upload } = setup();
      repo.failInsert = true;
      await expect(upload(png())).rejects.toThrow("metadata insert failed");
      expect(storage.putCalls).toHaveLength(1);
      expect(storage.deleteCalls).toEqual([storage.putCalls[0]?.key]);
      expect(storage.keys).toEqual([]);
      expect(repo.assets.size).toBe(0);
    });

    it("still reports the insert error when the cleanup delete also fails", async () => {
      const { storage, repo, upload } = setup();
      repo.failInsert = true;
      storage.failDelete = true;
      await expect(upload(png())).rejects.toThrow("metadata insert failed");
      expect(storage.deleteCalls).toHaveLength(1);
      expect(repo.assets.size).toBe(0);
    });

    it("leaves no object and no row, and deletes nothing, when the put fails", async () => {
      const { storage, repo, upload } = setup();
      storage.failPut = true;
      await expect(upload(png())).resolves.toEqual({
        ok: false,
        error: { kind: "storage-unavailable" },
      });
      expect(repo.insertCalls).toBe(0);
      expect(storage.deleteCalls).toHaveLength(0);
      expect(storage.keys).toEqual([]);
      expect(repo.assets.size).toBe(0);
    });

    it("never deletes an existing object when the put is refused because the key is taken", async () => {
      const { storage, repo, upload } = setup();
      const taken = "0b1f8c9e-2a4d-4e6f-8a1b-3c5d7e9f1a2b";
      const existing = loadFixture("fixture.jpg");
      await storage.put(`img/${taken}.png`, existing, "image/jpeg");
      const random = vi.spyOn(crypto, "randomUUID").mockReturnValue(taken);
      try {
        await expect(upload(png())).resolves.toEqual({
          ok: false,
          error: { kind: "storage-unavailable" },
        });
      } finally {
        random.mockRestore();
      }
      expect(storage.deleteCalls).toHaveLength(0);
      await expect(storage.get(`img/${taken}.png`)).resolves.toEqual({
        bytes: existing,
        contentType: "image/jpeg",
      });
      expect(repo.insertCalls).toBe(0);
    });
  });
});
