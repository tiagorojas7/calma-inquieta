import { expect, it } from "vitest";
import type { ImageStorage } from "~/modules/media";

let sequence = 0;
/** R2 suites share one simulated bucket, so every test uses its own key. */
function uniqueKey(): string {
  sequence += 1;
  return `img/contract-${String(sequence)}-${crypto.randomUUID()}.png`;
}

export function mediaStorageContract(create: () => ImageStorage): void {
  it("round-trips bytes and content type", async () => {
    const storage = create();
    const key = uniqueKey();
    await storage.put(key, new Uint8Array([1, 2]), "image/png");
    await expect(storage.get(key)).resolves.toEqual({
      bytes: new Uint8Array([1, 2]),
      contentType: "image/png",
    });
  });

  it("returns null for unknown keys", async () => {
    await expect(create().get(uniqueKey())).resolves.toBeNull();
  });

  it("removes an object on delete", async () => {
    const storage = create();
    const key = uniqueKey();
    await storage.put(key, new Uint8Array([3]), "image/webp");

    await storage.delete(key);

    await expect(storage.get(key)).resolves.toBeNull();
  });

  it("treats deleting an unknown key as a no-op", async () => {
    await expect(create().delete(uniqueKey())).resolves.toBeUndefined();
  });

  it("never overwrites an existing key", async () => {
    const storage = create();
    const key = uniqueKey();
    await storage.put(key, new Uint8Array([1]), "image/png");

    await expect(
      storage.put(key, new Uint8Array([9]), "image/jpeg"),
    ).rejects.toThrow();

    await expect(storage.get(key)).resolves.toEqual({
      bytes: new Uint8Array([1]),
      contentType: "image/png",
    });
  });
}
