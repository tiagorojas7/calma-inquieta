import { mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { cropBox, deriveJob, encodeIco, hashedName } from "./derive";

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
