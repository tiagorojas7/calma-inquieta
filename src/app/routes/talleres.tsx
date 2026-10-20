import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { tallerToCard } from "~/app/catalog/mappers";
import { buildPageMeta } from "~/app/seo/meta";
import { microcopy } from "~/app/ui/microcopy";
import { TallerCard } from "~/app/ui/molecules/taller-card";
import { CatalogGrid } from "~/app/ui/organisms/catalog-grid";
import { CatalogListingPage } from "~/app/ui/templates/catalog-listing-page";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { Route } from "./+types/talleres";

/**
 * A failing reader is not an empty list: errors propagate to the 500
 * boundary. Query parameters are never read (no filters, no sorting).
 */
export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [content, profile, talleres] = await Promise.all([
    services.siteContent.getCatalogContent(),
    services.siteContent.getBusinessProfile(),
    services.publicCatalog.talleres.list(),
  ]);
  const whatsapp = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages.general,
  );
  return {
    heading: content.talleres.heading,
    intro: content.talleres.intro.text,
    emptyMessage: content.talleres.emptyMessage,
    emptyAction: whatsapp.ok
      ? {
          href: whatsapp.value,
          label: `${microcopy.writeUs}${microcopy.whatsappSuffix}`,
        }
      : { href: profile.instagram.url, label: microcopy.followInstagram },
    cards: talleres.map((taller) => tallerToCard(taller, content)),
    metaInput: {
      title: content.talleres.seo.title,
      description: content.talleres.seo.description,
      path: "/talleres",
      siteName: profile.name,
      baseUrl: services.site.baseUrl,
      indexingEnabled: services.site.indexingEnabled,
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

export default function TalleresRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <CatalogListingPage heading={data.heading} intro={data.intro}>
      <CatalogGrid
        items={data.cards.map(({ id, ...card }) => ({
          key: id,
          node: <TallerCard {...card} />,
        }))}
        empty={{ message: data.emptyMessage, action: data.emptyAction }}
      />
    </CatalogListingPage>
  );
}
