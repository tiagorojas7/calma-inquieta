import { servicesContext } from "~/app/context";
import { PUBLIC_PAGES } from "~/app/site-map";
import { buildSitemapXml } from "~/app/seo/sitemap";
import type { Route } from "./+types/coming-soon";
export function loader({ context }: Route.LoaderArgs) {
  const site = context.get(servicesContext).site;
  return new Response(
    buildSitemapXml(
      site.baseUrl,
      PUBLIC_PAGES.filter((page) => page.indexable as boolean).map(
        (page) => page.path,
      ),
    ),
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
