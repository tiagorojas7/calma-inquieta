import { canonicalUrl } from "./canonical";

export const SHARE_IMAGE_PATH = "/media/stand-ins/share-default.jpg";
export type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  robots?: string;
  siteName: string;
  baseUrl: string;
  indexingEnabled: boolean;
  comingSoon?: boolean;
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
      content: canonicalUrl(input.baseUrl, SHARE_IMAGE_PATH),
    },
    { name: "twitter:card", content: "summary_large_image" },
    ...(robots ? [{ name: "robots", content: robots }] : []),
  ];
}
