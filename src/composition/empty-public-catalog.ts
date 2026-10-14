import type { MediaLookup } from "~/modules/media";
import type {
  PublicIntensivosReader,
  PublicTalleresReader,
} from "~/modules/workshops";

/**
 * Fail-soft placeholders (design PC3). Until a real reader is wired, the
 * public pages see "nothing published yet", which is the truth, rather than
 * the fail-closed Proxy that would turn every public request into a 5xx.
 */
export const EMPTY_PUBLIC_TALLERES: PublicTalleresReader = {
  list: () => Promise.resolve([]),
  findBySlug: () => Promise.resolve(null),
  listSlugs: () => Promise.resolve([]),
};

export const EMPTY_PUBLIC_INTENSIVOS: PublicIntensivosReader = {
  list: () => Promise.resolve([]),
  findBySlug: () => Promise.resolve(null),
  listSlugs: () => Promise.resolve([]),
};

/** No asset is resolvable until the real media lookup lands (C4-B5). */
export const EMPTY_MEDIA_LOOKUP: MediaLookup = {
  findAssets: () => Promise.resolve(new Map()),
};
