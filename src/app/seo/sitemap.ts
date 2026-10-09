import { canonicalUrl } from "./canonical";
const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
export function buildSitemapXml(
  base: string,
  paths: readonly string[],
): string {
  const urls = paths
    .map(
      (path) => `<url><loc>${escapeXml(canonicalUrl(base, path))}</loc></url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
