import { describe, expect, it, vi } from "vitest";
import type { ResizeEnv } from "./image-resize";
import { uploadChosenImage } from "./upload-chosen-image";

const image = { id: "i1", src: "/imagenes/i1.webp", width: 4, height: 2 };
const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

const env: ResizeEnv = {
  decode: () =>
    Promise.resolve({ width: 4, height: 2, release: () => undefined }),
  encode: (_i, _s, type) => Promise.resolve(new Blob(["y"], { type })),
};

describe("uploadChosenImage", () => {
  it("uploads the resized image, never the original file", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json(image)),
    );
    const result = await uploadChosenImage(file, { env, fetcher });
    expect(result).toEqual({ ok: true, image });
    const sent = vi.mocked(fetcher).mock.calls[0]?.[1]?.body as FormData;
    expect((sent.get("file") as File).type).toBe("image/webp");
  });

  it("stops with unsupported-format and sends nothing when decoding fails", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json(image)),
    );
    const broken: ResizeEnv = {
      ...env,
      decode: () => Promise.reject(new Error("x")),
    };
    expect(await uploadChosenImage(file, { env: broken, fetcher })).toEqual({
      ok: false,
      error: "unsupported-format",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
