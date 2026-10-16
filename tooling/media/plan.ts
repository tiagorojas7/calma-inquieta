export const VARIANT_WIDTHS = [480, 960, 1600] as const;

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export interface PlannedImage {
  readonly source: string;
  readonly base: string;
}

export interface InputClassification {
  readonly images: readonly PlannedImage[];
  readonly skipped: readonly string[];
}

/** Widths no larger than the source; never upscales. */
export function variantWidths(sourceWidth: number): number[] {
  const widths = VARIANT_WIDTHS.filter((width) => width <= sourceWidth);
  return widths.length > 0 ? widths : [sourceWidth];
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

export function outputBaseName(fileName: string): string {
  return stripExtension(fileName)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isSupportedImage(fileName: string): boolean {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return false;
  return SUPPORTED_EXTENSIONS.includes(fileName.slice(dot).toLowerCase());
}

/** Assigns unique base names; collisions get `-2`, `-3` in sorted input order. */
export function planOutputNames(fileNames: readonly string[]): PlannedImage[] {
  const used = new Map<string, number>();
  return [...fileNames].sort().map((source) => {
    const name = outputBaseName(source);
    const count = (used.get(name) ?? 0) + 1;
    used.set(name, count);
    return { source, base: count === 1 ? name : `${name}-${String(count)}` };
  });
}

export function classifyInputs(
  fileNames: readonly string[],
): InputClassification {
  const supported = fileNames.filter(isSupportedImage);
  return {
    images: planOutputNames(supported),
    skipped: fileNames.filter((name) => !isSupportedImage(name)).sort(),
  };
}
