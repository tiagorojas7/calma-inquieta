import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { classifyInputs, variantWidths } from "./plan";

export interface VariantEntry {
  readonly width: number;
  readonly height: number;
  readonly file: string;
  readonly bytes: number;
}

export interface ManifestEntry {
  readonly source: string;
  readonly base: string;
  readonly width: number;
  readonly height: number;
  readonly variants: readonly VariantEntry[];
}

export interface RunSummary {
  readonly processed: number;
  readonly upToDate: number;
  readonly unsupported: readonly string[];
  readonly inputBytes: number;
  readonly outputBytes: number;
}

type Orientation = "landscape" | "portrait" | "square";

// Keeps no file handles open between calls (Windows cannot delete them otherwise).
sharp.cache(false);

const WEBP_OPTIONS = { quality: 78, effort: 5 };

function orientationOf(width: number, height: number): Orientation {
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

/** Source dimensions after applying the EXIF orientation. */
async function orientedSize(file: string) {
  const { autoOrient } = await sharp(file).metadata();
  return { width: autoOrient.width, height: autoOrient.height };
}

async function modifiedMs(file: string): Promise<number | undefined> {
  try {
    return (await stat(file)).mtimeMs;
  } catch {
    return undefined;
  }
}

async function isUpToDate(
  sourceMs: number,
  outputs: readonly string[],
): Promise<boolean> {
  for (const output of outputs) {
    const ms = await modifiedMs(output);
    if (ms === undefined || ms < sourceMs) return false;
  }
  return true;
}

async function describeVariant(
  outputDir: string,
  file: string,
  width: number,
): Promise<VariantEntry> {
  const path = join(outputDir, file);
  const { height } = await sharp(path).metadata();
  return { width, height, file, bytes: (await stat(path)).size };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function contactSheet(manifest: readonly ManifestEntry[]): string {
  const cards = manifest
    .map((entry) => {
      const [smallest] = entry.variants;
      const shape = orientationOf(entry.width, entry.height);
      return `    <figure>
      <img src="${escapeHtml(smallest?.file ?? "")}" alt="${escapeHtml(entry.base)}" loading="lazy" />
      <figcaption><strong>${escapeHtml(entry.base)}</strong><br />${String(entry.width)} x ${String(entry.height)} - ${shape}</figcaption>
    </figure>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Contact sheet</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 1rem; }
      main { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
      figure { margin: 0; }
      img { width: 100%; height: auto; display: block; background: #eee; }
      figcaption { font-size: 0.85rem; padding-top: 0.25rem; }
    </style>
  </head>
  <body>
    <h1>Contact sheet (${String(manifest.length)} photos)</h1>
    <main>
${cards}
    </main>
  </body>
</html>
`;
}

export async function run(
  inputDir: string,
  outputDir: string,
): Promise<RunSummary> {
  const entries = await readdir(inputDir, { withFileTypes: true });
  const { images, skipped } = classifyInputs(
    entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
  );
  await mkdir(outputDir, { recursive: true });

  const manifest: ManifestEntry[] = [];
  let processed = 0;
  let upToDate = 0;
  let inputBytes = 0;

  for (const { source, base } of images) {
    const sourcePath = join(inputDir, source);
    const sourceStat = await stat(sourcePath);
    inputBytes += sourceStat.size;

    const size = await orientedSize(sourcePath);
    const widths = variantWidths(size.width);
    const files = widths.map((width) => `${base}-${String(width)}.webp`);

    if (
      await isUpToDate(
        sourceStat.mtimeMs,
        files.map((f) => join(outputDir, f)),
      )
    ) {
      upToDate += 1;
    } else {
      for (const [index, width] of widths.entries()) {
        await sharp(sourcePath)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp(WEBP_OPTIONS)
          .toFile(join(outputDir, files[index] ?? ""));
      }
      processed += 1;
    }

    const variants: VariantEntry[] = [];
    for (const [index, width] of widths.entries()) {
      variants.push(
        await describeVariant(outputDir, files[index] ?? "", width),
      );
    }
    manifest.push({ source, base, ...size, variants });
  }

  await writeFile(
    join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeFile(
    join(outputDir, "contact-sheet.html"),
    contactSheet(manifest),
  );

  const outputBytes = manifest
    .flatMap((entry) => entry.variants)
    .reduce((total, variant) => total + variant.bytes, 0);
  return { processed, upToDate, unsupported: skipped, inputBytes, outputBytes };
}

const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

async function main(args: readonly string[]): Promise<void> {
  const [inputDir, outputDir] = args;
  if (inputDir === undefined || outputDir === undefined) {
    console.error("Usage: pnpm media:optimize <inputDir> <outputDir>");
    process.exitCode = 1;
    return;
  }
  const summary = await run(inputDir, outputDir);
  for (const name of summary.unsupported)
    console.log(`Skipped (unsupported): ${name}`);
  console.log(
    `Processed ${String(summary.processed)}, up to date ${String(summary.upToDate)}, unsupported ${String(summary.unsupported.length)}. ` +
      `Input ${megabytes(summary.inputBytes)} MB, output ${megabytes(summary.outputBytes)} MB.`,
  );
}

const entryPoint = process.argv[1];
if (
  entryPoint !== undefined &&
  import.meta.url === pathToFileURL(entryPoint).href
) {
  await main(process.argv.slice(2));
}
