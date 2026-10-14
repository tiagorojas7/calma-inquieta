import type {
  ListOptions,
  PublicCatalogService,
  PublicIntensivo,
  PublicTaller,
} from "~/modules/workshops";

interface Sluggable {
  readonly slug: string;
}

/** A reader over fixed data: the given order is kept, `limit` slices, slugs match exactly. */
function readerOf<T extends Sluggable>(items: readonly T[]) {
  return {
    list: (options?: ListOptions) =>
      Promise.resolve(
        options?.limit === undefined ? items : items.slice(0, options.limit),
      ),
    findBySlug: (slug: string) =>
      Promise.resolve(items.find((item) => item.slug === slug) ?? null),
    listSlugs: () => Promise.resolve(items.map((item) => item.slug)),
  };
}

/** The public catalog over fixed read models, for route and loader tests. */
export function createFakePublicCatalog(
  data: {
    readonly talleres?: readonly PublicTaller[];
    readonly intensivos?: readonly PublicIntensivo[];
  } = {},
): PublicCatalogService {
  return {
    talleres: readerOf(data.talleres ?? []),
    intensivos: readerOf(data.intensivos ?? []),
  };
}
