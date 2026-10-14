import { expect, it } from "vitest";
import type { ImageStorage } from "~/modules/media";

export function mediaStorageContract(create: () => ImageStorage): void {
  it("round-trips bytes and content type", async () => {
    const storage = create();
    await storage.put("img/test.png", new Uint8Array([1, 2]), "image/png");
    await expect(storage.get("img/test.png")).resolves.toEqual({
      bytes: new Uint8Array([1, 2]),
      contentType: "image/png",
    });
  });

  it("returns null for unknown keys", async () => {
    await expect(create().get("img/missing.png")).resolves.toBeNull();
  });
}
