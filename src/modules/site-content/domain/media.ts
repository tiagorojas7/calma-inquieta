export type MediaArea =
  "home" | "about" | "contact" | "share" | "brand" | "video";
export type PeopleInFrame = "none" | "hands" | "faces";
export type ConsentStatus = "not-required" | "granted" | "pending";

export interface RightsEntry {
  readonly sourceId: string;
  readonly people: PeopleInFrame;
  readonly consent: ConsentStatus;
  readonly consentSource?: { readonly by: string; readonly recordedOn: string };
}

export interface ExcludedSource {
  readonly sourceId: string;
  readonly reason: "not-the-owner" | "minor";
  readonly decidedOn: string;
}

export interface ImageVariant {
  readonly width: number;
  readonly height: number;
  readonly path: string;
}

export interface ImageAsset {
  readonly kind: "image";
  readonly id: string;
  readonly sourceId: string;
  readonly area: MediaArea;
  readonly alt: string;
  readonly decorative?: true;
  readonly format: "webp" | "jpeg" | "png" | "ico";
  readonly variants: readonly [ImageVariant, ...ImageVariant[]];
}

export interface VideoAsset {
  readonly kind: "video";
  readonly id: string;
  readonly sourceId: string;
  readonly area: "video";
  readonly width: number;
  readonly height: number;
  readonly durationSeconds: number;
  readonly audio: false;
  readonly sources: readonly {
    readonly path: string;
    readonly type: "video/webm" | "video/mp4";
  }[];
  readonly posterId: string;
}

export type MediaAsset = ImageAsset | VideoAsset;

export interface MediaRegistry {
  readonly assets: readonly MediaAsset[];
  readonly rights: readonly RightsEntry[];
  readonly excluded: readonly ExcludedSource[];
}

export type MediaRule =
  | "unregistered-media"
  | "unpublishable-media"
  | "excluded-source"
  | "rights-missing"
  | "consent-source-missing"
  | "consent-required"
  | "alt-missing"
  | "variant-size"
  | "variant-order"
  | "media-path"
  | "poster-missing"
  | "share-image-missing";

export interface MediaIssue {
  readonly id: string;
  readonly rule: MediaRule;
  readonly path?: string;
  readonly sourceId?: string;
}

/** Normalizes source identifiers for case- and separator-insensitive exclusion checks. */
export function exclusionToken(value: string): string {
  return value.toLowerCase().replace(/[_\s]+/g, "-");
}

export function mentionsExcludedSource(
  value: string,
  excluded: readonly ExcludedSource[],
): boolean {
  const token = exclusionToken(value);
  return excluded.some(({ sourceId }) =>
    token.includes(exclusionToken(sourceId)),
  );
}

function hasConsentSource(entry: RightsEntry): boolean {
  return Boolean(
    entry.consentSource?.by.trim() && entry.consentSource.recordedOn.trim(),
  );
}

export function isPublishable(
  asset: MediaAsset,
  registry: MediaRegistry,
): boolean {
  if (mentionsExcludedSource(asset.sourceId, registry.excluded)) {
    return false;
  }

  const rights = registry.rights.find(
    ({ sourceId }) => sourceId === asset.sourceId,
  );
  if (!rights) {
    return false;
  }

  if (rights.consent === "granted") {
    return hasConsentSource(rights);
  }

  return rights.consent === "not-required" && rights.people !== "faces";
}

export function publishedPaths(registry: MediaRegistry): ReadonlySet<string> {
  const paths = new Set<string>();

  for (const asset of registry.assets) {
    if (!isPublishable(asset, registry)) {
      continue;
    }

    const assetPaths =
      asset.kind === "image"
        ? asset.variants.map(({ path }) => path)
        : asset.sources.map(({ path }) => path);
    assetPaths.forEach((path) => paths.add(path));
  }

  return paths;
}

export function largestVariant(asset: ImageAsset): ImageVariant {
  return asset.variants.reduce((largest, variant) =>
    variant.width > largest.width ? variant : largest,
  );
}

export function srcSetOf(asset: ImageAsset): string {
  return asset.variants
    .map(({ path, width }) => `${path} ${String(width)}w`)
    .join(", ");
}

export function srcSetPaths(srcSet: string): readonly string[] {
  return srcSet
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter((path): path is string => Boolean(path));
}

export function toImageRef(
  asset: ImageAsset,
  preferredWidth = 960,
): {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly srcSet: string;
} {
  const smallest = asset.variants.reduce((candidate, variant) =>
    variant.width < candidate.width ? variant : candidate,
  );
  const chosen = asset.variants.reduce<ImageVariant>((candidate, variant) => {
    if (variant.width > preferredWidth) {
      return candidate;
    }
    return candidate.width > preferredWidth || variant.width > candidate.width
      ? variant
      : candidate;
  }, smallest);

  return {
    src: chosen.path,
    alt: asset.alt,
    width: chosen.width,
    height: chosen.height,
    srcSet: srcSetOf(asset),
  };
}

const MEDIA_PATH_PATTERN =
  /^\/media\/([^/]+)\/(.+)-(\d+)\.([0-9a-f]{8})\.(webp|jpg|png|mp4|webm)$/;

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function imagePathIsValid(asset: ImageAsset, variant: ImageVariant): boolean {
  if (
    asset.area === "brand" &&
    asset.format === "ico" &&
    variant.path === "/favicon.ico"
  ) {
    return true;
  }

  const match = MEDIA_PATH_PATTERN.exec(variant.path);
  if (!match) {
    return false;
  }

  const [, area, id, width, , extension] = match;
  const expectedExtension = asset.format === "jpeg" ? "jpg" : asset.format;
  return (
    area === asset.area &&
    id === asset.id &&
    width === String(variant.width) &&
    extension === expectedExtension
  );
}

function videoPathIsValid(
  asset: VideoAsset,
  source: VideoAsset["sources"][number],
): boolean {
  const match = MEDIA_PATH_PATTERN.exec(source.path);
  if (!match) {
    return false;
  }

  const [, area, id, width, , extension] = match;
  const expectedExtension = source.type === "video/mp4" ? "mp4" : "webm";
  return (
    area === asset.area &&
    id === asset.id &&
    width === String(asset.width) &&
    extension === expectedExtension
  );
}

export function validateMediaRegistry(
  registry: MediaRegistry,
): readonly MediaIssue[] {
  const issues: MediaIssue[] = [];

  for (const asset of registry.assets) {
    if (mentionsExcludedSource(asset.sourceId, registry.excluded)) {
      issues.push({
        id: asset.id,
        rule: "excluded-source",
        sourceId: asset.sourceId,
      });
    }
    if (mentionsExcludedSource(asset.id, registry.excluded)) {
      issues.push({ id: asset.id, rule: "excluded-source" });
    }

    if (asset.kind === "image") {
      for (const variant of asset.variants) {
        if (mentionsExcludedSource(variant.path, registry.excluded)) {
          issues.push({
            id: asset.id,
            rule: "excluded-source",
            path: variant.path,
          });
        }
      }

      if (!asset.decorative && !asset.alt.trim()) {
        issues.push({ id: asset.id, rule: "alt-missing" });
      }

      const validSizes = asset.variants.every(
        ({ width, height }) =>
          isPositiveInteger(width) && isPositiveInteger(height),
      );
      for (const variant of asset.variants) {
        if (
          !isPositiveInteger(variant.width) ||
          !isPositiveInteger(variant.height)
        ) {
          issues.push({
            id: asset.id,
            rule: "variant-size",
            path: variant.path,
          });
        }
      }

      if (validSizes && asset.variants.length > 1) {
        const first = asset.variants[0];
        let previousWidth = first.width;
        let ordered = true;
        for (const variant of asset.variants.slice(1)) {
          if (variant.width <= previousWidth) {
            ordered = false;
          }
          previousWidth = variant.width;
        }
        const oneRatio = asset.variants
          .slice(1)
          .every(
            (variant) =>
              Math.abs(
                variant.height - (variant.width * first.height) / first.width,
              ) <= 1,
          );
        if (!ordered || !oneRatio) {
          issues.push({ id: asset.id, rule: "variant-order" });
        }
      }

      for (const variant of asset.variants) {
        if (!imagePathIsValid(asset, variant)) {
          issues.push({ id: asset.id, rule: "media-path", path: variant.path });
        }
      }
      continue;
    }

    for (const source of asset.sources) {
      if (mentionsExcludedSource(source.path, registry.excluded)) {
        issues.push({
          id: asset.id,
          rule: "excluded-source",
          path: source.path,
        });
      }
    }
    if (mentionsExcludedSource(asset.posterId, registry.excluded)) {
      issues.push({
        id: asset.id,
        rule: "excluded-source",
        path: asset.posterId,
      });
    }

    if (!isPositiveInteger(asset.width) || !isPositiveInteger(asset.height)) {
      issues.push({ id: asset.id, rule: "variant-size" });
    }
    for (const source of asset.sources) {
      if (!videoPathIsValid(asset, source)) {
        issues.push({ id: asset.id, rule: "media-path", path: source.path });
      }
    }
    if (
      !registry.assets.some(
        (candidate) =>
          candidate.kind === "image" && candidate.id === asset.posterId,
      )
    ) {
      issues.push({ id: asset.id, rule: "poster-missing" });
    }
  }

  for (const rights of registry.rights) {
    if (mentionsExcludedSource(rights.sourceId, registry.excluded)) {
      issues.push({
        id: rights.sourceId,
        rule: "excluded-source",
        sourceId: rights.sourceId,
      });
    }
    if (rights.consent === "granted" && !hasConsentSource(rights)) {
      issues.push({ id: rights.sourceId, rule: "consent-source-missing" });
    }
    if (rights.people === "faces" && rights.consent === "not-required") {
      issues.push({ id: rights.sourceId, rule: "consent-required" });
    }
  }

  return issues;
}

export const DEFAULT_SHARE_IMAGE = {
  path: "/media/share/share-default-1200.00000000.jpg",
  width: 1200,
  height: 630,
  alt: "Imagen predeterminada para compartir",
} as const;
