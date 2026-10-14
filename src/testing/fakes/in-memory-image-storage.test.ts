import { describe, expect, it } from "vitest";
import { InMemoryImageStorage } from "./in-memory-image-storage";

describe("InMemoryImageStorage", () => {
  it("stores and retrieves immutable image bytes", async () => {
    const storage = new InMemoryImageStorage();
    await storage.put("img/a.png", new Uint8Array([1, 2]), "image/png");
    const input = new Uint8Array([1, 2]);
    const storage2 = new InMemoryImageStorage();
    await storage2.put("img/c.png", input, "image/png");
    input[0] = 9;
    const image = await storage.get("img/a.png");
    const copied = await storage2.get("img/c.png");
    expect(copied?.bytes[0]).toBe(1);
    expect(image?.contentType).toBe("image/png");
    expect([...(image?.bytes ?? [])]).toEqual([1, 2]);
    if (copied) copied.bytes[0] = 8;
    expect((await storage2.get("img/c.png"))?.bytes[0]).toBe(1);
  });

  it("does not overwrite an existing key", async () => {
    const storage = new InMemoryImageStorage();
    await storage.put("img/a.png", new Uint8Array([1]), "image/png");
    await expect(
      storage.put("img/a.png", new Uint8Array([2]), "image/png"),
    ).rejects.toThrow("already exists");
  });
});
