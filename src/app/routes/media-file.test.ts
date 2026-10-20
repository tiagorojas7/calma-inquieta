import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { servicesContext } from "~/app/context";
import { createMediaService } from "~/modules/media";
import { createUnavailableImageStorage } from "~/modules/media/infrastructure/unavailable-image-storage";
import { InMemoryImageStorage } from "~/testing/fakes/in-memory-image-storage";
import { InMemoryMediaAssetRepository } from "~/testing/fakes/in-memory-media-asset-repository";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createTestServices } from "~/testing/fakes/app-services";
import { loadFixture } from "~/testing/media/fixtures";
import { loader } from "./media-file";

function setup(unavailableStorage = false) {
  const media = createMediaService({
    storage: unavailableStorage
      ? createUnavailableImageStorage()
      : new InMemoryImageStorage(),
    repository: new InMemoryMediaAssetRepository(),
    clock: fixedClock(new Date("2026-10-05T12:00:00.000Z")),
  });
  const context = new RouterContextProvider();
  context.set(servicesContext, createTestServices({ media }));
  const get = (file: string) =>
    loader({
      request: new Request(`http://localhost/imagenes/${file}`),
      params: { file },
      context,
    } as never);
  return { media, get };
}

const UNKNOWN = "11111111-1111-4111-8111-111111111111.png";

describe("media file resource route", () => {
  it("serves a stored image with immutable headers and no admin identity", async () => {
    const { media, get } = setup();
    const uploaded = await media.upload(testAdminActor(), {
      bytes: loadFixture("fixture.png"),
    });
    if (!uploaded.ok) throw new Error("fixture upload failed");
    const response = await get(uploaded.value.fileName);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; sandbox",
    );
    expect(response.headers.get("ETag")).toBe(`"${uploaded.value.id}"`);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      loadFixture("fixture.png"),
    );
  });

  it("answers an unknown id with an empty, uncached 404", async () => {
    const { get } = setup();
    const response = await get(UNKNOWN);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it("answers a malformed name with 404", async () => {
    const { get } = setup();
    const response = await get("../secret.png");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("answers 404, not an error, when storage is unavailable", async () => {
    const { get } = setup(true);
    const response = await get(UNKNOWN);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});
