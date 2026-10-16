import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { intensivoToDetail } from "~/app/catalog/mappers";
import { buildActivityWhatsAppUrl } from "~/app/catalog/whatsapp";
import { buildPageMeta, truncateDescription } from "~/app/seo/meta";
import { IntensivoDetailPage } from "~/app/ui/templates/intensivo-detail-page";
import type { Route } from "./+types/intensivo";

const DESCRIPTION_LIMIT = 160;

/**
 * Every unavailable slug (unknown, draft, cancelled, archived, past) is the
 * same bare 404, so the response never says why. Reader errors propagate.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const intensivo = await services.publicCatalog.intensivos.findBySlug(
    params.slug,
  );
  if (intensivo === null) {
    throw data(null, { status: 404 });
  }
  const [content, profile] = await Promise.all([
    services.siteContent.getCatalogContent(),
    services.siteContent.getBusinessProfile(),
  ]);
  const link = buildActivityWhatsAppUrl({
    profile: {
      whatsappDisplay: profile.whatsapp.display,
      instagramUrl: profile.instagram.url,
    },
    content,
    message:
      intensivo.status === "paused"
        ? { kind: "paused", name: intensivo.name }
        : { kind: "intensivo", name: intensivo.name, date: intensivo.date },
  });
  const cover = intensivo.images[0];
  return {
    detail: intensivoToDetail(intensivo, content, link),
    metaInput: {
      title: intensivo.name,
      description: truncateDescription(intensivo.summary, DESCRIPTION_LIMIT),
      path: `/intensivos/${intensivo.slug}`,
      siteName: profile.name,
      baseUrl: services.site.baseUrl,
      indexingEnabled: services.site.indexingEnabled,
      ...(cover ? { ogImage: cover.src } : {}),
    },
  };
}

export function meta({ loaderData, error }: Route.MetaArgs) {
  if (error)
    return [
      { title: "Página no encontrada" },
      { name: "robots", content: "noindex, nofollow" },
    ];
  return buildPageMeta(loaderData.metaInput);
}

export default function IntensivoRoute() {
  return <IntensivoDetailPage {...useLoaderData<typeof loader>().detail} />;
}
