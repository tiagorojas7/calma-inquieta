export function canonicalUrl(base: string, pathOrUrl: string): string {
  const baseUrl = new URL(base.endsWith("/") ? base : `${base}/`);
  const target = new URL(pathOrUrl, baseUrl);
  target.search = "";
  target.hash = "";
  const path =
    target.pathname === "/" ? "/" : target.pathname.replace(/\/+$/, "");
  return `${target.origin}${path}${target.port ? "" : ""}`;
}
