import { DEFAULT_SHARE_IMAGE } from "~/modules/site-content";
import { canonicalUrl } from "./canonical";

export type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  robots?: string;
  siteName: string;
  baseUrl: string;
  indexingEnabled: boolean;
  comingSoon?: boolean;
  /** Path or URL of the share image; defaults to the registered site share image. */
  ogImage?: string;
};
export function buildPageMeta(input: PageMetaInput) {
  if (!input.description.trim())
    throw new Error("Page description must not be empty");
  const title = input.title.includes(" | ")
    ? input.title
    : `${input.title} | ${input.siteName}`;
  const url = canonicalUrl(input.baseUrl, input.path);
  const robots =
    input.comingSoon || !input.indexingEnabled
      ? "noindex, nofollow"
      : input.robots;
  return [
    { title },
    { name: "description", content: input.description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:locale", content: "es_AR" },
    {
      property: "og:image",
      content: canonicalUrl(
        input.baseUrl,
        input.ogImage ?? DEFAULT_SHARE_IMAGE.path,
      ),
    },
    // An override has an unknown size, so the size tags describe the default only.
    ...(input.ogImage === undefined
      ? [
          {
            property: "og:image:width",
            content: String(DEFAULT_SHARE_IMAGE.width),
          },
          {
            property: "og:image:height",
            content: String(DEFAULT_SHARE_IMAGE.height),
          },
        ]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    ...(robots ? [{ name: "robots", content: robots }] : []),
  ];
}

const ELLIPSIS = "…";

/**
 * Cuts `text` to at most `limit` characters, at the last word boundary, and
 * appends an ellipsis. Text that already fits is returned untouched.
 */
export function truncateDescription(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const room = text.slice(0, limit - ELLIPSIS.length + 1);
  const boundary = room.lastIndexOf(" ");
  const cut = boundary > 0 ? room.slice(0, boundary) : room.slice(0, -1);
  return `${cut.trimEnd()}${ELLIPSIS}`;
}
