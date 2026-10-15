import type { MediaAsset } from "~/modules/media";
import type { Teacher } from "~/modules/teachers";
import type { IntensiveStatus, WorkshopStatus } from "./contracts";
import type {
  CatalogImageRef,
  PublicImage,
  PublicStatus,
  PublicTeacher,
} from "./public-catalog";

/**
 * Projection helpers (PC6). Every object is built with literal keys and never
 * from a spread, so a field added upstream cannot reach a public response.
 */

/** Keeps the stored order; an image whose asset the lookup omits is dropped (DA4). */
export function projectImages(
  refs: readonly CatalogImageRef[],
  assets: ReadonlyMap<string, MediaAsset>,
): readonly PublicImage[] {
  const images: PublicImage[] = [];
  for (const ref of refs) {
    const asset = assets.get(ref.assetId);
    if (asset === undefined) continue;
    images.push({
      src: asset.src,
      alt: ref.alt,
      width: asset.width,
      height: asset.height,
    });
  }
  return images;
}

/** An archived teacher is still the assigned one (DA3); an empty bio is `null`. */
export function projectTeacher(
  teacher: Teacher | undefined,
): PublicTeacher | null {
  if (teacher === undefined) return null;
  return {
    name: teacher.name,
    bioLine: teacher.bioLine.trim() === "" ? null : teacher.bioLine,
  };
}

/** Only a visible status has a public one; anything else reaching here is a bug. */
export function publicStatus(
  status: WorkshopStatus | IntensiveStatus,
): PublicStatus {
  if (status === "published") return "open";
  if (status === "paused") return "paused";
  throw new Error(`status "${status}" is not public`);
}
