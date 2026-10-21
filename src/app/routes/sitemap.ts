import { servicesContext } from "~/app/context";
import { PUBLIC_PAGES } from "~/app/site-map";
import { buildSitemapXml } from "~/app/seo/sitemap";
import type { Route } from "./+types/sitemap";

const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8" };

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const staticPaths = PUBLIC_PAGES.filter((page) => page.indexable).map(
    (page) => page.path,
  );
  try {
    const [talleres, intensivos] = await Promise.all([
      services.publicCatalog.talleres.listSlugs(),
      services.publicCatalog.intensivos.listSlugs(),
    ]);
    return new Response(
      buildSitemapXml(services.site.baseUrl, [
        ...staticPaths,
        ...talleres.map((slug) => `/talleres/${slug}`),
        ...intensivos.map((slug) => `/intensivos/${slug}`),
      ]),
      {
        headers: { ...XML_HEADERS, "Cache-Control": "public, max-age=3600" },
      },
    );
  } catch {
    console.error("sitemap: catalog read failed");
    return new Response(buildSitemapXml(services.site.baseUrl, staticPaths), {
      headers: { ...XML_HEADERS, "Cache-Control": "public, max-age=300" },
    });
  }
}
