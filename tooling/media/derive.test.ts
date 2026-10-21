import { mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import {
  cropBox,
  deriveJob,
  encodeIco,
  GRADE_PRESETS,
  hashedName,
} from "./derive";

sharp.cache(false);

async function temporaryDirectory(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

async function dimensions(path: string | Buffer) {
  const { width, height } = await sharp(path).metadata();
  return { width, height };
}

describe("cropBox", () => {
  it("centers the largest box of the aspect on the focus point", () => {
    expect(cropBox(1000, 600, 1, { x: 0.75, y: 0.5 })).toEqual({
      left: 400,
      top: 0,
      width: 600,
      height: 600,
    });
  });

  it("clamps to the frame at an edge focus", () => {
    expect(cropBox(1000, 600, 1, { x: 0, y: 0 })).toEqual({
      left: 0,
      top: 0,
      width: 600,
      height: 600,
    });
  });
});

describe("hashedName", () => {
  it("builds <id>-<width>.<hash8>.<ext>", () => {
    expect(hashedName("home-hero", 480, Buffer.from("output"), "webp")).toBe(
      "home-hero-480.e0ee8bb5.webp",
    );
  });
});

describe("encodeIco", () => {
  it("writes an ICO header with one PNG entry per size", async () => {
    const output = join(await temporaryDirectory("media-ico-"), "favicon.ico");

    await encodeIco(output, [16, 32, 48]);

    const ico = await readFile(output);
    expect(ico.subarray(0, 6)).toEqual(Buffer.from([0, 0, 1, 0, 3, 0]));
    const entries = [16, 32, 48].map((size, index) => {
      const entry = 6 + index * 16;
      const offset = ico.readUInt32LE(entry + 12);
      const bytes = ico.readUInt32LE(entry + 8);
      return { size, offset, bytes };
    });
    expect(new Set(entries.map((entry) => entry.offset)).size).toBe(3);
    for (const [index, entry] of entries.entries()) {
      expect(entry.offset).toBeGreaterThanOrEqual(54);
      expect(entry.offset + entry.bytes).toBeLessThanOrEqual(ico.length);
      expect(ico.subarray(entry.offset, entry.offset + 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(
        await dimensions(
          ico.subarray(entry.offset, entry.offset + entry.bytes),
        ),
      ).toEqual({
        width: entry.size,
        height: entry.size,
      });
      if (index > 0) {
        const previous = entries[index - 1];
        expect(
          previous === undefined ? 0 : previous.offset + previous.bytes,
        ).toBeLessThanOrEqual(entry.offset);
      }
    }
  });
});

describe("deriveJob", () => {
  it("writes hashed variants into public/media and prints their actual dimensions", async () => {
    const root = await temporaryDirectory("media-derive-");
    const outputRoot = join(root, "output");
    await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#884422" },
    })
      .png()
      .toFile(join(root, "fixture.png"));
    // The source root intentionally lives outside the output root.
    await sharp(join(root, "fixture.png"))
      .png()
      .toFile(join(root, "source.png"));
    const printed = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const result = await deriveJob(
      {
        id: "fixture",
        source: "source.png",
        area: "home",
        widths: [32, 64],
        format: "webp",
      },
      root,
      outputRoot,
    );

    const mediaDir = join(outputRoot, "public", "media", "home");
    const files = await readdir(mediaDir);
    expect(files).toHaveLength(2);
    expect(result.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 32, height: 24 }),
        expect.objectContaining({ width: 64, height: 48 }),
      ]),
    );
    for (const variant of result.variants) {
      expect(
        await dimensions(join(outputRoot, "public", variant.path)),
      ).toEqual({
        width: variant.width,
        height: variant.height,
      });
    }
    expect(printed).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
    await expect(stat(join(outputRoot, "src"))).rejects.toThrow();
    printed.mockRestore();
  });

  it("rotates EXIF orientation before calculating an aspect crop", async () => {
    const root = await temporaryDirectory("media-orientation-");
    await sharp({
      create: { width: 80, height: 40, channels: 3, background: "#2244aa" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toFile(join(root, "source.jpg"));

    const result = await deriveJob(
      {
        id: "oriented",
        source: "source.jpg",
        area: "home",
        aspect: 0.5,
        widths: [40],
        format: "webp",
      },
      root,
      root,
    );

    expect(result.variants).toEqual([
      expect.objectContaining({ width: 40, height: 80 }),
    ]);
  });

  it("rejects unsafe area and id segments before writing", async () => {
    const root = await temporaryDirectory("media-safe-segment-");
    await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#2244aa" },
    })
      .png()
      .toFile(join(root, "source.png"));

    const unsafeSegments = [
      { area: "../escape", id: "safe" },
      { area: "/absolute", id: "safe" },
      { area: "home/other", id: "safe" },
      { area: "home\\other", id: "safe" },
      { area: ".", id: "safe" },
      { area: "..", id: "safe" },
      { area: "", id: "safe" },
      { area: "home", id: "../escape" },
      { area: "home", id: "unsafe/id" },
      { area: "home", id: "unsafe_id" },
      { area: "home", id: "" },
    ];
    for (const { area, id } of unsafeSegments) {
      await expect(
        deriveJob(
          { id, source: "source.png", area, widths: [32], format: "webp" },
          root,
          root,
        ),
      ).rejects.toThrow(/Invalid (area|id)/);
    }
    await expect(stat(join(root, "public"))).rejects.toThrow();
  });

  it("never upscales and adds the source width only once when it is narrower than the next requested width", async () => {
    const root = await temporaryDirectory("media-small-");
    await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#2244aa" },
    })
      .png()
      .toFile(join(root, "source.png"));

    const result = await deriveJob(
      {
        id: "small",
        source: "source.png",
        area: "home",
        widths: [32, 64, 96],
        format: "webp",
      },
      root,
      root,
    );

    expect(result.variants.map((variant) => variant.width)).toEqual([32, 64]);
  });

  it("removes older hashed files of the same id and width", async () => {
    const root = await temporaryDirectory("media-replace-");
    await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#2244aa" },
    })
      .png()
      .toFile(join(root, "source.png"));
    const mediaDir = join(root, "public", "media", "home");
    await sharp({
      create: { width: 32, height: 24, channels: 3, background: "#000000" },
    })
      .webp()
      .toFile(join(root, "old.webp"));

    await deriveJob(
      {
        id: "replace",
        source: "source.png",
        area: "home",
        widths: [32],
        format: "webp",
      },
      root,
      root,
    );
    await writeFile(join(mediaDir, "replace-32.00000000.webp"), "old");
    await deriveJob(
      {
        id: "replace",
        source: "source.png",
        area: "home",
        widths: [32],
        format: "webp",
        quality: 70,
      },
      root,
      root,
    );

    expect(
      (await readdir(mediaDir)).filter((name) =>
        name.startsWith("replace-32."),
      ),
    ).toHaveLength(1);
  });

  it("encodes JPEG for the share job and WebP otherwise", async () => {
    const root = await temporaryDirectory("media-formats-");
    await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#2244aa" },
    })
      .png()
      .toFile(join(root, "source.png"));

    const [share, webp] = await Promise.all([
      deriveJob(
        {
          id: "share",
          source: "source.png",
          area: "share",
          widths: [64],
          format: "jpeg",
        },
        root,
        root,
      ),
      deriveJob(
        {
          id: "image",
          source: "source.png",
          area: "home",
          widths: [64],
          format: "webp",
        },
        root,
        root,
      ),
    ]);

    expect(share.variants[0]?.path).toMatch(/\.jpg$/);
    expect(webp.variants[0]?.path).toMatch(/\.webp$/);
  });
});

describe("grade", () => {
  async function greySource(prefix: string): Promise<string> {
    const root = await temporaryDirectory(prefix);
    await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#808080" },
    })
      .png()
      .toFile(join(root, "source.png"));
    return root;
  }

  function job(grade?: "warm") {
    return {
      id: "graded",
      source: "source.png",
      area: "home",
      widths: [64],
      format: "png" as const,
      ...(grade === undefined ? {} : { grade }),
    };
  }

  async function outputOf(root: string, grade?: "warm"): Promise<Buffer> {
    const printed = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    const result = await deriveJob(job(grade), root, root);
    printed.mockRestore();
    const variant = result.variants[0];
    return readFile(join(root, "public", variant?.path ?? ""));
  }

  it("exposes the warm preset with explicit numeric parameters", () => {
    expect(GRADE_PRESETS.warm).toEqual({
      red: 1.08,
      green: 1.01,
      blue: 0.86,
      contrast: 0.93,
      brightness: 1.05,
      saturation: 0.9,
    });
  });

  it("a graded output differs from an ungraded one", async () => {
    const root = await greySource("media-grade-differs-");

    const plain = await outputOf(root);
    const graded = await outputOf(root, "warm");

    expect(graded.equals(plain)).toBe(false);
  });

  it("a warm grade raises mean red relative to blue on a neutral grey image", async () => {
    const root = await greySource("media-grade-warm-");

    const plain = (await sharp(await outputOf(root)).stats()).channels;
    const graded = (await sharp(await outputOf(root, "warm")).stats()).channels;

    const [plainRed, , plainBlue] = plain.map(({ mean }) => mean);
    const [gradedRed, , gradedBlue] = graded.map(({ mean }) => mean);
    expect(plainRed).toBeCloseTo(plainBlue ?? 0, 0);
    expect((gradedRed ?? 0) - (gradedBlue ?? 0)).toBeGreaterThan(8);
  });

  it("an omitted grade leaves the output byte-identical to the plain pipeline", async () => {
    const root = await greySource("media-grade-omitted-");

    const output = await outputOf(root);

    const expected = await sharp(join(root, "source.png"))
      .rotate()
      .resize({ width: 64, withoutEnlargement: true })
      .png()
      .toBuffer();
    expect(output.equals(expected)).toBe(true);
  });

  it("rejects an unknown grade before writing", async () => {
    const root = await greySource("media-grade-unknown-");

    await expect(
      deriveJob({ ...job(), grade: "neon" as "warm" }, root, root),
    ).rejects.toThrow(/Unknown grade/);
    await expect(stat(join(root, "public"))).rejects.toThrow();
  });
});

describe("explicit crop, trim and tint", () => {
  const quiet = () =>
    vi.spyOn(console, "log").mockImplementation(() => undefined);

  async function derivePng(
    root: string,
    options: Record<string, unknown>,
    widths: readonly number[] = [1000],
  ) {
    const printed = quiet();
    const result = await deriveJob(
      {
        id: "artwork",
        source: "source.png",
        area: "brand",
        widths,
        format: "png",
        ...options,
      } as never,
      root,
      root,
    );
    printed.mockRestore();
    const variant = result.variants[0];
    return readFile(join(root, "public", variant?.path ?? ""));
  }

  async function pixel(buffer: Buffer, x: number, y: number) {
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (y * info.width + x) * 4;
    return [data[at], data[at + 1], data[at + 2], data[at + 3]];
  }

  it("crops the exact pixel box of the oriented source", async () => {
    const root = await temporaryDirectory("media-crop-");
    await sharp({
      create: { width: 80, height: 40, channels: 3, background: "#2244aa" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toFile(join(root, "source.jpg"));
    const printed = quiet();

    const result = await deriveJob(
      {
        id: "boxed",
        source: "source.jpg",
        area: "home",
        crop: { left: 4, top: 30, width: 30, height: 50 },
        widths: [30],
        format: "webp",
      },
      root,
      root,
    );
    printed.mockRestore();

    expect(result.variants).toEqual([
      expect.objectContaining({ width: 30, height: 50 }),
    ]);
  });

  it("keeps only the pixels inside the crop box", async () => {
    const root = await temporaryDirectory("media-crop-pixels-");
    const left = await sharp({
      create: { width: 50, height: 100, channels: 3, background: "#ff0000" },
    })
      .png()
      .toBuffer();
    await sharp({
      create: { width: 100, height: 100, channels: 3, background: "#0000ff" },
    })
      .composite([{ input: left, left: 0, top: 0 }])
      .png()
      .toFile(join(root, "source.png"));

    const output = await derivePng(root, {
      crop: { left: 50, top: 0, width: 50, height: 100 },
    });

    const channels = (await sharp(output).stats()).channels.map((c) => c.mean);
    expect(channels.slice(0, 3)).toEqual([0, 0, 255]);
  });

  it("rejects a crop together with an aspect, and a crop outside the source", async () => {
    const root = await temporaryDirectory("media-crop-invalid-");
    await sharp({
      create: { width: 40, height: 40, channels: 3, background: "#808080" },
    })
      .png()
      .toFile(join(root, "source.png"));

    await expect(
      derivePng(root, {
        aspect: 1,
        crop: { left: 0, top: 0, width: 10, height: 10 },
      }),
    ).rejects.toThrow(/crop or aspect/);
    await expect(
      derivePng(root, { crop: { left: 30, top: 0, width: 20, height: 10 } }),
    ).rejects.toThrow(/outside the source/);
    await expect(stat(join(root, "public"))).rejects.toThrow();
  });

  async function artwork(prefix: string): Promise<string> {
    const root = await temporaryDirectory(prefix);
    const block = await sharp({
      create: {
        width: 40,
        height: 20,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const soft = await sharp({
      create: {
        width: 10,
        height: 20,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: block, left: 30, top: 40 },
        { input: soft, left: 70, top: 40 },
      ])
      .png()
      .toFile(join(root, "source.png"));
    return root;
  }

  it("trims the transparent margin around the artwork", async () => {
    const root = await artwork("media-trim-");

    const output = await derivePng(root, { trim: true });

    expect(await dimensions(output)).toEqual({ width: 50, height: 20 });
  });

  it("leaves the transparent margin alone when trim is omitted", async () => {
    const root = await artwork("media-no-trim-");

    const output = await derivePng(root, {});

    expect(await dimensions(output)).toEqual({ width: 100, height: 100 });
  });

  it("recolours the artwork to a flat colour and keeps the alpha", async () => {
    const root = await artwork("media-tint-");

    const output = await derivePng(root, { trim: true, tint: "#f9f6f1" });

    expect(await pixel(output, 5, 10)).toEqual([249, 246, 241, 255]);
    const [red, green, blue, alpha] = await pixel(output, 45, 10);
    expect([red, green, blue]).toEqual([249, 246, 241]);
    expect(alpha).toBeGreaterThan(120);
    expect(alpha).toBeLessThan(135);
  });

  it("rejects a tint that is not a #rrggbb colour before writing", async () => {
    const root = await artwork("media-tint-invalid-");

    await expect(derivePng(root, { tint: "cream" })).rejects.toThrow(
      /Invalid tint/,
    );
    await expect(stat(join(root, "public"))).rejects.toThrow();
  });
});
