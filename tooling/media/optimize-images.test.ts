import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "./optimize-images";

sharp.cache(false);

let workDir = "";
let inputDir = "";
let outputDir = "";

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "media-optimize-"));
  inputDir = join(workDir, "in");
  outputDir = join(workDir, "out");
  await mkdir(inputDir);

  // Stored as 2000x1000 with EXIF orientation 6, so it displays as 1000x2000.
  await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#884422" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toFile(join(inputDir, "Foto Ñandú.JPG"));
  await sharp({
    create: { width: 300, height: 300, channels: 3, background: "#2244aa" },
  })
    .png()
    .toFile(join(inputDir, "small.png"));
  await writeFile(join(inputDir, "clip.mp4"), "not an image");
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function dimensions(file: string) {
  const { width, height } = await sharp(file).metadata();
  return { width, height };
}

describe("run", { timeout: 30_000 }, () => {
  it("writes oriented variants, a manifest and a contact sheet", async () => {
    const summary = await run(inputDir, outputDir);

    expect(summary.processed).toBe(2);
    expect(summary.upToDate).toBe(0);
    expect(summary.unsupported).toEqual(["clip.mp4"]);
    expect(summary.inputBytes).toBeGreaterThan(0);
    expect(summary.outputBytes).toBeGreaterThan(0);

    expect(await dimensions(join(outputDir, "foto-nandu-480.webp"))).toEqual({
      width: 480,
      height: 960,
    });
    expect(await dimensions(join(outputDir, "foto-nandu-960.webp"))).toEqual({
      width: 960,
      height: 1920,
    });
    // The source is only 1000 px wide, so there is no 1600 variant.
    await expect(
      stat(join(outputDir, "foto-nandu-1600.webp")),
    ).rejects.toThrow();

    // No upscaling: the 300 px source only gets its own width.
    expect(await dimensions(join(outputDir, "small-300.webp"))).toEqual({
      width: 300,
      height: 300,
    });
    await expect(stat(join(outputDir, "small-480.webp"))).rejects.toThrow();

    const manifest: unknown = JSON.parse(
      await readFile(join(outputDir, "manifest.json"), "utf8"),
    );
    const sizes = await Promise.all(
      ["foto-nandu-480.webp", "foto-nandu-960.webp", "small-300.webp"].map(
        async (name) => (await stat(join(outputDir, name))).size,
      ),
    );
    expect(manifest).toEqual([
      {
        source: "Foto Ñandú.JPG",
        base: "foto-nandu",
        width: 1000,
        height: 2000,
        variants: [
          {
            width: 480,
            height: 960,
            file: "foto-nandu-480.webp",
            bytes: sizes[0],
          },
          {
            width: 960,
            height: 1920,
            file: "foto-nandu-960.webp",
            bytes: sizes[1],
          },
        ],
      },
      {
        source: "small.png",
        base: "small",
        width: 300,
        height: 300,
        variants: [
          {
            width: 300,
            height: 300,
            file: "small-300.webp",
            bytes: sizes[2],
          },
        ],
      },
    ]);

    const sheet = await readFile(join(outputDir, "contact-sheet.html"), "utf8");
    expect(sheet).toContain("foto-nandu-480.webp");
    expect(sheet).toContain("portrait");
    expect(sheet).toContain("square");
    expect(sheet).toContain("1000 x 2000");
  });

  it("skips everything on a second run", async () => {
    await run(inputDir, outputDir);
    const second = await run(inputDir, outputDir);

    expect(second.processed).toBe(0);
    expect(second.upToDate).toBe(2);
    const manifest: unknown = JSON.parse(
      await readFile(join(outputDir, "manifest.json"), "utf8"),
    );
    expect(manifest).toHaveLength(2);
  });
});
