import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export type ImageFormat = "webp" | "jpeg" | "png" | "ico";

export interface FocusPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Named colour grades. Every value is explicit so a re-derive is reproducible:
 * `red`, `green` and `blue` scale the channels (a white-balance shift),
 * `contrast` pivots linearly around mid-grey (below 1 softens), `brightness`
 * and `saturation` are multipliers for sharp `modulate`.
 */
export const GRADE_PRESETS = {
  warm: {
    red: 1.08,
    green: 1.01,
    blue: 0.86,
    contrast: 0.93,
    brightness: 1.05,
    saturation: 0.9,
  },
} as const;

export type GradeName = keyof typeof GRADE_PRESETS;

export interface DeriveJob {
  readonly id: string;
  readonly source: string;
  readonly area: string;
  readonly aspect?: number;
  readonly focus?: FocusPoint;
  readonly widths: readonly number[];
  readonly format: ImageFormat;
  readonly quality?: number;
  readonly background?: string;
  readonly grade?: GradeName;
}

export interface DerivedVariant {
  readonly width: number;
  readonly height: number;
  readonly path: string;
}

interface CropBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

type SharpImage = ReturnType<typeof sharp>;

export interface DerivedJob {
  readonly id: string;
  readonly variants: readonly DerivedVariant[];
}

/** Returns the largest aspect-ratio box within a frame, centered on focus. */
export function cropBox(
  frameWidth: number,
  frameHeight: number,
  aspect: number,
  focus: FocusPoint = { x: 0.5, y: 0.5 },
): CropBox {
  if (aspect <= 0) throw new Error("aspect must be greater than zero");

  const width = Math.min(frameWidth, Math.round(frameHeight * aspect));
  const height = Math.min(frameHeight, Math.round(frameWidth / aspect));
  const left = Math.round(
    Math.min(Math.max(0, focus.x * frameWidth - width / 2), frameWidth - width),
  );
  const top = Math.round(
    Math.min(
      Math.max(0, focus.y * frameHeight - height / 2),
      frameHeight - height,
    ),
  );
  return { left, top, width, height };
}

export function hashedName(
  id: string,
  width: number,
  output: Buffer,
  extension: string,
): string {
  const hash = createHash("sha256").update(output).digest("hex").slice(0, 8);
  return `${id}-${String(width)}.${hash}.${extension}`;
}

function pngEntry(size: number, source?: SharpImage): Promise<Buffer> {
  return (
    source === undefined
      ? sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
      : source.clone().resize({ width: size, height: size, fit: "cover" })
  )
    .png()
    .toBuffer();
}

/** Writes a PNG-backed ICO file with one directory entry for every requested size. */
export async function encodeIco(
  output: string,
  sizes: readonly number[],
  source?: SharpImage,
): Promise<void> {
  const images = await Promise.all(sizes.map((size) => pngEntry(size, source)));
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16;
    const size = sizes[index] ?? 0;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header[entry + 2] = 0;
    header[entry + 3] = 0;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  }

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, Buffer.concat([header, ...images]));
}

function selectedWidths(
  sourceWidth: number,
  requested: readonly number[],
): number[] {
  const widths = requested.filter((width) => width <= sourceWidth);
  if (requested.some((width) => width > sourceWidth)) widths.push(sourceWidth);
  return [...new Set(widths)].sort((a, b) => a - b);
}

function safeSegment(kind: "area" | "id", value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) {
    throw new Error(
      `Invalid ${kind} "${value}": use lowercase letters, numbers, and single hyphens only`,
    );
  }
  return value;
}

function extensionFor(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

function gradeFor(name: string | undefined) {
  if (name === undefined) return undefined;
  if (!Object.hasOwn(GRADE_PRESETS, name)) {
    throw new Error(
      `Unknown grade "${name}": use one of ${Object.keys(GRADE_PRESETS).join(", ")}`,
    );
  }
  return GRADE_PRESETS[name as GradeName];
}

function applyGrade(
  image: SharpImage,
  grade: (typeof GRADE_PRESETS)[GradeName] | undefined,
): SharpImage {
  if (grade === undefined) return image;
  return image
    .recomb([
      [grade.red, 0, 0],
      [0, grade.green, 0],
      [0, 0, grade.blue],
    ])
    .linear(grade.contrast, 128 * (1 - grade.contrast))
    .modulate({
      brightness: grade.brightness,
      saturation: grade.saturation,
    });
}

async function encode(
  input: SharpImage,
  format: Exclude<ImageFormat, "ico">,
  quality?: number,
  background?: string,
): Promise<Buffer> {
  const prepared =
    background === undefined ? input : input.flatten({ background });
  if (format === "webp")
    return prepared.webp({ quality: quality ?? 78 }).toBuffer();
  if (format === "jpeg")
    return prepared.jpeg({ mozjpeg: true, quality: quality ?? 82 }).toBuffer();
  return prepared.png().toBuffer();
}

async function removeOldVariants(
  outputDir: string,
  id: string,
  width: number,
  extension: string,
  replacement: string,
): Promise<void> {
  const prefix = `${id}-${String(width)}.`;
  const suffix = `.${extension}`;
  for (const file of await readdir(outputDir)) {
    if (
      file !== replacement &&
      file.startsWith(prefix) &&
      file.endsWith(suffix)
    ) {
      await unlink(join(outputDir, file));
    }
  }
}

export async function deriveJob(
  job: DeriveJob,
  sourceRoot: string,
  outputRoot: string,
): Promise<DerivedJob> {
  const area = safeSegment("area", job.area);
  const id = safeSegment("id", job.id);
  const grade = gradeFor(job.grade);
  const sourcePath = isAbsolute(job.source)
    ? job.source
    : join(sourceRoot, job.source);
  const { width, height } = (await sharp(sourcePath).metadata()).autoOrient;
  const input = sharp(sourcePath).rotate();

  const crop =
    job.aspect === undefined
      ? undefined
      : cropBox(width, height, job.aspect, job.focus);
  const sourceWidth = crop?.width ?? width;
  const outputDir = join(outputRoot, "public", "media", area);
  const widths = selectedWidths(sourceWidth, job.widths);
  const extension = extensionFor(job.format);
  await mkdir(outputDir, { recursive: true });

  const variants: DerivedVariant[] = [];
  for (const width of widths) {
    const prepared =
      crop === undefined ? input.clone() : input.clone().extract(crop);
    const rendered = applyGrade(
      prepared.resize({ width, withoutEnlargement: true }),
      grade,
    );
    let output: Buffer;
    if (job.format === "ico") {
      const temporary = join(outputDir, `.tmp-${id}-${String(width)}.ico`);
      await encodeIco(temporary, [width], rendered);
      output = await readFile(temporary);
      await unlink(temporary);
    } else {
      output = await encode(rendered, job.format, job.quality, job.background);
    }
    const file = hashedName(id, width, output, extension);
    await writeFile(join(outputDir, file), output);
    await removeOldVariants(outputDir, id, width, extension, file);

    const dimensions =
      job.format === "ico"
        ? { width, height: width }
        : await sharp(output).metadata();
    variants.push({
      width: dimensions.width,
      height: dimensions.height,
      path: `/media/${area}/${file}`,
    });
  }

  const fragment = { id: job.id, variants };
  console.log(JSON.stringify(fragment, null, 2));
  return fragment;
}

async function main(args: readonly string[]): Promise<void> {
  const [recipePath, sourceRoot, outputRoot = process.cwd()] = args;
  if (recipePath === undefined || sourceRoot === undefined) {
    console.error(
      "Usage: pnpm media:derive <recipe.json> <sourceDir> [outputRoot]",
    );
    process.exitCode = 1;
    return;
  }
  let recipe: unknown;
  try {
    recipe = JSON.parse(await readFile(recipePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read recipe ${recipePath}`, { cause: error });
  }
  const jobs = Array.isArray(recipe)
    ? recipe
    : (recipe as { jobs?: readonly DeriveJob[] }).jobs;
  if (!Array.isArray(jobs))
    throw new Error("Recipe must be an array or { jobs: [] }");
  for (const job of jobs)
    await deriveJob(job as DeriveJob, sourceRoot, outputRoot);
}

const entryPoint = process.argv[1];
if (
  entryPoint !== undefined &&
  import.meta.url === pathToFileURL(entryPoint).href
) {
  await main(process.argv.slice(2));
}
