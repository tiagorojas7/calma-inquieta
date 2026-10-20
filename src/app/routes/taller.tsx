import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { tallerToDetail } from "~/app/catalog/mappers";
import { buildActivityWhatsAppUrl } from "~/app/catalog/whatsapp";
import { buildPageMeta, truncateDescription } from "~/app/seo/meta";
import { TallerDetailPage } from "~/app/ui/templates/taller-detail-page";
import type { Route } from "./+types/taller";

const DESCRIPTION_LIMIT = 160;

/**
 * Every unavailable slug (unknown, draft, archived, cross-type, malformed) is
 * the same bare 404, so the response never says why. Reader errors propagate.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const taller = await services.publicCatalog.talleres.findBySlug(params.slug);
  if (taller === null) {
    throw data(null, { status: 404 });
  }
  const [content, profile] = await Promise.all([
    services.siteContent.getCatalogContent(),
    services.siteContent.getBusinessProfile(),
  ]);
  const linkProfile = {
    whatsappDisplay: profile.whatsapp.display,
    instagramUrl: profile.instagram.url,
  };
  const paused = taller.status === "paused";
  const links = {
    main: buildActivityWhatsAppUrl({
      profile: linkProfile,
      content,
      message: paused
        ? { kind: "paused", name: taller.name }
        : { kind: "taller", name: taller.name },
    }),
    turnos: paused
      ? []
      : taller.turnos.map((turno) =>
          buildActivityWhatsAppUrl({
            profile: linkProfile,
            content,
            message: {
              kind: "turno",
              name: taller.name,
              weekday: turno.weekday,
              startsAt: turno.startsAt,
              endsAt: turno.endsAt,
            },
          }),
        ),
  };
  const cover = taller.images[0];
  return {
    detail: tallerToDetail(taller, content, links),
    metaInput: {
      title: taller.name,
      description: truncateDescription(taller.summary, DESCRIPTION_LIMIT),
      path: `/talleres/${taller.slug}`,
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

export default function TallerRoute() {
  return <TallerDetailPage {...useLoaderData<typeof loader>().detail} />;
}
