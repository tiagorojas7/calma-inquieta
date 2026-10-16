import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { readMediaBinding } from "~/platform/r2";
import { mediaStorageContract } from "~/testing/contracts/media-storage.contract";
import { createR2ImageStorage } from "./r2-image-storage";

let dispose: () => Promise<void> = () => Promise.resolve();
let env: object = {};

// Wrangler's local simulation of R2, in memory (`persist: false`); nothing
// reaches Cloudflare.
beforeAll(async () => {
  const proxy = await getPlatformProxy({ persist: false });
  env = proxy.env;
  dispose = proxy.dispose;
}, 60_000);
afterAll(() => dispose());

describe("R2 image storage on the local simulation", () => {
  it("finds the MEDIA binding declared in wrangler.jsonc", () => {
    expect(readMediaBinding(env)).not.toBeNull();
  });

  describe("contract", () => {
    mediaStorageContract(() => {
      const bucket = readMediaBinding(env);
      if (!bucket) throw new Error("MEDIA binding missing");
      return createR2ImageStorage(bucket);
    });
  });
});
