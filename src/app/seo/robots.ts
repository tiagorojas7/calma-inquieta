import { canonicalUrl } from "./canonical";
export function buildRobotsTxt({
  indexing,
  base,
}: {
  indexing: boolean;
  base: string;
}): string {
  return indexing
    ? `User-agent: *\nAllow: /\nSitemap: ${canonicalUrl(base, "/sitemap.xml")}`
    : "User-agent: *\nDisallow: /";
}
