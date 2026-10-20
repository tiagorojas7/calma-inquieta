import { describe, expect, it } from "vitest";
import {
  fitWithin,
  MAX_LONG_EDGE,
  resizeForUpload,
  type ResizeEnv,
} from "./image-resize";

describe("fitWithin", () => {
  it("keeps a small image as is", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("scales a wide image so its long edge is the limit", () => {
    expect(fitWithin(4800, 2400)).toEqual({
      width: MAX_LONG_EDGE,
      height: 1200,
    });
  });

  it("scales a tall image so its long edge is the limit", () => {
    expect(fitWithin(3000, 6000)).toEqual({
      width: 1200,
      height: MAX_LONG_EDGE,
    });
  });

  it("never returns a zero side", () => {
    expect(fitWithin(10000, 1)).toEqual({ width: MAX_LONG_EDGE, height: 1 });
  });
});

function envWith(options: { decode?: ResizeEnv["decode"]; webp?: boolean }): {
  env: ResizeEnv;
  encoded: { type: string; quality: number }[];
} {
  const encoded: { type: string; quality: number }[] = [];
  const env: ResizeEnv = {
    decode:
      options.decode ??
      (() =>
        Promise.resolve({
          width: 4800,
          height: 2400,
          release: () => undefined,
        })),
    encode: (_image, size, type, quality) => {
      encoded.push({ type, quality });
      expect(size).toEqual({ width: MAX_LONG_EDGE, height: 1200 });
      const produced =
        type === "image/webp" && options.webp === false ? "image/png" : type;
      return Promise.resolve(new Blob(["x"], { type: produced }));
    },
  };
  return { env, encoded };
}

const file = new File(["x"], "foto.heic", { type: "image/jpeg" });

describe("resizeForUpload", () => {
  it("encodes WebP at the fitted size when the browser honors it", async () => {
    const { env, encoded } = envWith({});
    const result = await resizeForUpload(file, env);
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.blob.type).toBe("image/webp");
    expect(encoded.map((entry) => entry.type)).toEqual(["image/webp"]);
  });

  it("falls back to JPEG at 0.85 when the browser silently returns PNG", async () => {
    const { env, encoded } = envWith({ webp: false });
    const result = await resizeForUpload(file, env);
    expect(result.ok && result.blob.type).toBe("image/jpeg");
    expect(encoded).toEqual([
      { type: "image/webp", quality: 0.85 },
      { type: "image/jpeg", quality: 0.85 },
    ]);
  });

  it("reports an unsupported format when the image cannot be decoded", async () => {
    const { env } = envWith({ decode: () => Promise.reject(new Error("bad")) });
    expect(await resizeForUpload(file, env)).toEqual({
      ok: false,
      error: "unsupported-format",
    });
  });

  it("releases the decoded image after encoding", async () => {
    let released = 0;
    const { env } = envWith({
      decode: () =>
        Promise.resolve({
          width: 4800,
          height: 2400,
          release: () => {
            released += 1;
          },
        }),
    });
    await resizeForUpload(file, env);
    expect(released).toBe(1);
  });
});
