import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { intensivoToCard } from "~/app/catalog/mappers";
import { buildPageMeta } from "~/app/seo/meta";
import { microcopy } from "~/app/ui/microcopy";
import { IntensivoCard } from "~/app/ui/molecules/intensivo-card";
import { CatalogGrid } from "~/app/ui/organisms/catalog-grid";
import { CatalogListingPage } from "~/app/ui/templates/catalog-listing-page";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { Route } from "./+types/intensivos";

/**
 * A failing reader is not an empty list: errors propagate to the 500
 * boundary. Query parameters are never read (no filters, no sorting).
 */
export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [content, profile, intensivos] = await Promise.all([
    services.siteContent.getCatalogContent(),
    services.siteContent.getBusinessProfile(),
    services.publicCatalog.intensivos.list(),
  ]);
  const whatsapp = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages.general,
  );
  return {
    heading: content.intensivos.heading,
    intro: content.intensivos.intro.text,
    emptyMessage: content.intensivos.emptyMessage,
    emptyAction: whatsapp.ok
      ? {
          href: whatsapp.value,
          label: `${microcopy.writeUs}${microcopy.whatsappSuffix}`,
        }
      : { href: profile.instagram.url, label: microcopy.followInstagram },
    cards: intensivos.map((intensivo) => intensivoToCard(intensivo, content)),
    metaInput: {
      title: content.intensivos.seo.title,
      description: content.intensivos.seo.description,
      path: "/intensivos",
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

export default function IntensivosRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <CatalogListingPage heading={data.heading} intro={data.intro}>
      <CatalogGrid
        items={data.cards.map(({ id, ...card }) => ({
          key: id,
          node: <IntensivoCard {...card} />,
        }))}
        empty={{ message: data.emptyMessage, action: data.emptyAction }}
      />
    </CatalogListingPage>
  );
}
