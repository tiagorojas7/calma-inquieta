import { describe, expect, it } from "vitest";
import type { MediaAsset, MediaAssetRepository } from "~/modules/media";

const ID_A = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
const ID_B = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
const ID_UNKNOWN = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";

export function buildAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  const id = overrides.id ?? ID_A;
  return {
    id,
    fileName: `${id}.webp`,
    src: `/imagenes/${id}.webp`,
    contentType: "image/webp",
    byteSize: 1234,
    width: 800,
    height: 600,
    createdBy: "admin@example.com",
    createdAt: new Date("2026-10-14T12:00:00.000Z"),
    ...overrides,
  };
}

/** Behavior every MediaAssetRepository implementation must satisfy. */
export function runMediaAssetRepositoryContract(
  create: () => Promise<MediaAssetRepository>,
): void {
  describe("MediaAssetRepository contract", () => {
    it("round-trips every field of an inserted asset", async () => {
      const repo = await create();
      const asset = buildAsset();

      await repo.insert(asset);

      const found = await repo.findByIds([asset.id]);
      expect(found.get(asset.id)).toEqual(asset);
    });

    it("returns only the requested ids and omits unknown ones", async () => {
      const repo = await create();
      const a = buildAsset({ id: ID_A });
      const b = buildAsset({ id: ID_B, contentType: "image/png" });
      await repo.insert(a);
      await repo.insert(b);

      const found = await repo.findByIds([ID_B, ID_UNKNOWN]);

      expect([...found.keys()]).toEqual([ID_B]);
      expect(found.get(ID_B)).toEqual(b);
    });

    it("returns an empty map for no ids", async () => {
      const repo = await create();
      await repo.insert(buildAsset());

      expect((await repo.findByIds([])).size).toBe(0);
    });

    it("rejects a second insert with the same id", async () => {
      const repo = await create();
      await repo.insert(buildAsset());

      await expect(repo.insert(buildAsset())).rejects.toThrow();
    });

    it("rejects a second insert with the same file name", async () => {
      const repo = await create();
      await repo.insert(buildAsset());

      await expect(
        repo.insert(buildAsset({ id: ID_B, fileName: `${ID_A}.webp` })),
      ).rejects.toThrow();
    });
  });
}
