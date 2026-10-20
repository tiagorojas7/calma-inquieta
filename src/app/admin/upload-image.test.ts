import { describe, expect, it, vi } from "vitest";
import { uploadAdminImage } from "./upload-image";

const blob = new Blob(["x"], { type: "image/webp" });

function fetchReturning(status: number, body: unknown): typeof fetch {
  return vi.fn(() => Promise.resolve(Response.json(body, { status })));
}

describe("uploadAdminImage", () => {
  it("posts the file to /admin/imagenes and returns the stored image", async () => {
    const image = { id: "i1", src: "/imagenes/i1.webp", width: 10, height: 5 };
    const fetcher = fetchReturning(200, image);
    expect(await uploadAdminImage(blob, fetcher)).toEqual({ ok: true, image });
    const [url, init] = vi.mocked(fetcher).mock.calls[0] ?? [];
    expect(url).toBe("/admin/imagenes");
    expect(init?.method).toBe("POST");
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it.each([
    [413, { error: { kind: "too-large" } }, "too-large"],
    [422, { error: { kind: "unsupported-type" } }, "unsupported-format"],
    [422, { error: { kind: "unreadable-dimensions" } }, "unsupported-format"],
    [503, { error: { kind: "storage-unavailable" } }, "unavailable"],
    [403, null, "failed"],
    [500, { oops: true }, "failed"],
  ])("maps status %i %j to %s", async (status, body, error) => {
    expect(await uploadAdminImage(blob, fetchReturning(status, body))).toEqual({
      ok: false,
      error,
    });
  });

  it("maps a network failure to failed", async () => {
    const fetcher: typeof fetch = () => Promise.reject(new Error("offline"));
    expect(await uploadAdminImage(blob, fetcher)).toEqual({
      ok: false,
      error: "failed",
    });
  });

  it("posts with a plain fetch to the document route, never to a .data URL (the Worker gate denies /admin .data)", async () => {
    const fetcher = fetchReturning(200, {
      id: "i1",
      src: "/imagenes/i1.webp",
      width: 1,
      height: 1,
    });
    await uploadAdminImage(blob, fetcher);
    expect(vi.mocked(fetcher).mock.calls[0]?.[0]).toBe("/admin/imagenes");
  });
});
