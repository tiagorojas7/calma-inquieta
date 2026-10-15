import { data, useLoaderData } from "react-router";
import { buildWhatsAppUrl } from "~/modules/site-content";
import { servicesContext } from "~/app/context";
import { ComingSoonPage } from "~/app/ui/templates/coming-soon-page";
import type { Route } from "./+types/coming-soon";
import { buildPageMeta } from "~/app/seo/meta";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const requestPathname = request.url.split(/[?#]/, 1)[0] ?? "";
  const pathname = requestPathname
    .replace(/\.data$/, "")
    .slice(requestPathname.lastIndexOf("/") + 1);
  const candidate = (params as { slug?: string }).slug ?? pathname;
  const supportedSlugs = ["talleres", "eventos-privados"] as const;
  if (!supportedSlugs.includes(candidate as (typeof supportedSlugs)[number])) {
    throw data(null, { status: 404 });
  }
  const slug = candidate as (typeof supportedSlugs)[number];
  const [page, profile] = await Promise.all([
    services.siteContent.getComingSoonPage(slug),
    services.siteContent.getBusinessProfile(),
  ]);
  const whatsappHref = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages[slug],
  );
  return {
    ...page,
    slug,
    whatsappHref: whatsappHref.ok ? whatsappHref.value : undefined,
    instagramHref: profile.instagram.url,
    site: services.site,
  };
}

export function meta({ loaderData, error }: Route.MetaArgs) {
  if (error)
    return [
      { title: "Página no encontrada" },
      { name: "robots", content: "noindex, nofollow" },
    ];
  return buildPageMeta({
    title: loaderData.title,
    description: loaderData.seo.description,
    path: `/${loaderData.slug}`,
    robots: "noindex, nofollow",
    siteName: "Calma Inquieta",
    baseUrl: loaderData.site.baseUrl,
    indexingEnabled: loaderData.site.indexingEnabled,
    comingSoon: true,
  });
}

export default function ComingSoonRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <ComingSoonPage
      title={data.title}
      message={data.message}
      whatsappHref={data.whatsappHref ?? "#"}
      instagramHref={data.instagramHref}
    />
  );
}
