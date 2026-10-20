import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { servicesContext } from "~/app/context";
import { createMediaService, MAX_UPLOAD_REQUEST_BYTES } from "~/modules/media";
import { createUnavailableImageStorage } from "~/modules/media/infrastructure/unavailable-image-storage";
import { adminAccessFor, deniedAccess } from "~/testing/fakes/admin-actor";
import { createTestServices } from "~/testing/fakes/app-services";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryImageStorage } from "~/testing/fakes/in-memory-image-storage";
import { InMemoryMediaAssetRepository } from "~/testing/fakes/in-memory-media-asset-repository";
import { loadFixture } from "~/testing/media/fixtures";
import { action } from "./image-upload";

function setup(options: { admin?: boolean; storage?: "ok" | "down" } = {}) {
  const storage = new InMemoryImageStorage();
  const media = createMediaService({
    storage:
      options.storage === "down" ? createUnavailableImageStorage() : storage,
    repository: new InMemoryMediaAssetRepository(),
    clock: fixedClock(new Date("2026-10-05T12:00:00.000Z")),
  });
  const context = new RouterContextProvider();
  context.set(
    servicesContext,
    createTestServices({
      media,
      adminAccess:
        options.admin === false ? deniedAccess() : adminAccessFor("a@x.test"),
    }),
  );
  const post = (body: FormData, headers: Record<string, string> = {}) =>
    action({
      request: new Request("https://panel.example.test/admin/imagenes", {
        method: "POST",
        headers: { Origin: "https://panel.example.test", ...headers },
        body,
      }),
      params: {},
      context,
    } as never);
  return { post, storage };
}

function formWith(bytes: Uint8Array, name = "photo.png") {
  const form = new FormData();
  form.set("file", new File([bytes as BlobPart], name));
  return form;
}

const SIZE = { "Content-Length": "1000" };

describe("admin image upload route", () => {
  it("stores the image and answers id, src and dimensions", async () => {
    const { post, storage } = setup();
    const response = await post(formWith(loadFixture("fixture.png")), SIZE);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["height", "id", "src", "width"]);
    expect(body.src).toBe(`/imagenes/${String(body.id)}.png`);
    expect(body.width).toBeGreaterThan(0);
    expect(await storage.get(`img/${String(body.id)}.png`)).not.toBeNull();
  });

  it("answers 411 before parsing when Content-Length is missing", async () => {
    const { post } = setup();
    const response = await post(formWith(loadFixture("fixture.png")));
    expect(response.status).toBe(411);
  });

  it("answers 413 before parsing when Content-Length is over the request limit", async () => {
    const { post } = setup();
    const response = await post(formWith(loadFixture("fixture.png")), {
      "Content-Length": String(MAX_UPLOAD_REQUEST_BYTES + 1),
    });
    expect(response.status).toBe(413);
  });

  it("answers 400 when the file part is missing", async () => {
    const { post } = setup();
    const form = new FormData();
    form.set("file", "not a file");
    const response = await post(form, SIZE);
    expect(response.status).toBe(400);
  });

  it("answers 422 unsupported-type for a renamed non-image", async () => {
    const { post } = setup();
    const form = formWith(new TextEncoder().encode("plain text"), "photo.jpg");
    const response = await post(form, SIZE);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: { kind: "unsupported-type" },
    });
  });

  it("answers 503 storage-unavailable without crashing", async () => {
    const { post } = setup({ storage: "down" });
    const response = await post(formWith(loadFixture("fixture.png")), SIZE);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { kind: "storage-unavailable" },
    });
  });

  it("denies a non-admin with 403 and stores nothing", async () => {
    const { post, storage } = setup({ admin: false });
    await expect(
      post(formWith(loadFixture("fixture.png")), SIZE),
    ).rejects.toMatchObject({ init: { status: 403 } });
    expect(storage.keys.length).toBe(0);
  });

  it("denies a cross-origin upload with 403", async () => {
    const { post } = setup();
    await expect(
      post(formWith(loadFixture("fixture.png")), {
        ...SIZE,
        Origin: "https://evil.example.test",
      }),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });
});
