import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { intensivoToDetail } from "~/app/catalog/mappers";
import { buildActivityWhatsAppUrl } from "~/app/catalog/whatsapp";
import { intensiveRequestCopy } from "~/app/intensive-requests/copy";
import { buildEventJsonLd, serializeJsonLd } from "~/app/seo/json-ld";
import { buildPageMeta, truncateDescription } from "~/app/seo/meta";
import { JsonLdScript } from "~/app/ui/json-ld-script";
import { IntensivoDetailPage } from "~/app/ui/templates/intensivo-detail-page";
import type { Route } from "./+types/intensivo";

const DESCRIPTION_LIMIT = 160;
const CENTAVOS_PER_PESO = 100;

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
  // The seat request replaces the WhatsApp-only call to action while the
  // intensivo is open and has seats; any other answer keeps the inquiry link.
  const open =
    intensivo.status === "open"
      ? await services.intensiveRequests.getOffer(intensivo.slug)
      : null;
  const reservation = open?.ok
    ? {
        href: `/intensivos/${intensivo.slug}/reserva`,
        label: intensiveRequestCopy.reserveCta,
      }
    : undefined;
  const cover = intensivo.images[0];
  const path = `/intensivos/${intensivo.slug}`;
  return {
    jsonLd: serializeJsonLd(
      buildEventJsonLd(
        {
          name: intensivo.name,
          summary: intensivo.summary,
          path,
          date: intensivo.date,
          startsAt: intensivo.startsAt,
          endsAt: intensivo.endsAt,
          pricePesos: intensivo.price.toCentavos() / CENTAVOS_PER_PESO,
          status: intensivo.status,
          teacherName: intensivo.teacher?.name,
          images: intensivo.images.map((image) => image.src),
        },
        profile,
        services.site.baseUrl,
      ),
    ),
    detail: intensivoToDetail(intensivo, content, link, reservation),
    metaInput: {
      title: intensivo.name,
      description: truncateDescription(intensivo.summary, DESCRIPTION_LIMIT),
      path,
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
  const { detail, jsonLd } = useLoaderData<typeof loader>();
  return (
    <>
      <IntensivoDetailPage {...detail} />
      <JsonLdScript json={jsonLd} />
    </>
  );
}
