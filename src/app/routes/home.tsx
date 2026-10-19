import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "~/app/seo/json-ld";
import { artDirectedPreloads } from "~/app/media/preload";
import { buildPageMeta } from "~/app/seo/meta";
import { JsonLdScript } from "~/app/ui/json-ld-script";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { PublicCatalogService } from "~/modules/workshops";
import {
  intensivoToUpcomingItem,
  tallerToActivityCard,
} from "~/app/catalog/mappers";
import { AboutTeaser } from "~/app/ui/organisms/about-teaser";
import { ActivityShowcase } from "~/app/ui/organisms/activity-showcase";
import { ContactBand } from "~/app/ui/organisms/contact-band";
import {
  HERO_DESKTOP_MEDIA,
  HERO_MOBILE_MEDIA,
  HERO_STILL_SIZES,
  HeroSection,
} from "~/app/ui/organisms/hero-section";
import { TestimonialsSection } from "~/app/ui/organisms/testimonials-section";
import { TrustRow } from "~/app/ui/organisms/trust-row";
import { UpcomingList } from "~/app/ui/organisms/upcoming-list";
import type { Route } from "./+types/home";

const INICIO_ACTIVITY_LIMIT = 3;

const HERO_PRELOAD = {
  sizes: HERO_STILL_SIZES,
  mobileMedia: HERO_MOBILE_MEDIA,
  desktopMedia: HERO_DESKTOP_MEDIA,
};

/**
 * Inicio is the exception to "reader errors propagate": a failing catalog read
 * returns `null` (the page then omits both activity sections) and logs only a
 * constant message, never the error text or any data.
 */
async function readCatalog(catalog: PublicCatalogService) {
  try {
    return await Promise.all([
      catalog.talleres.list({ limit: INICIO_ACTIVITY_LIMIT }),
      catalog.intensivos.list({ limit: INICIO_ACTIVITY_LIMIT }),
    ]);
  } catch {
    console.error("home: catalog read failed");
    return null;
  }
}

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [content, profile, catalogContent, catalog] = await Promise.all([
    services.siteContent.getHomePage(),
    services.siteContent.getBusinessProfile(),
    services.siteContent.getCatalogContent(),
    readCatalog(services.publicCatalog),
  ]);
  const [talleres, intensivos] = catalog ?? [[], []];
  const whatsapp = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages.general,
  );
  return {
    hero: { ...content.hero, bajada: profile.bajada },
    trustClaims: content.trustClaims,
    catalogFailed: catalog === null,
    monthly: talleres.map((taller) =>
      tallerToActivityCard(taller, catalogContent),
    ),
    monthlyHeading: content.monthly.heading,
    monthlyMessage: content.monthly.emptyMessage,
    intensivos: intensivos.map((intensivo) =>
      intensivoToUpcomingItem(intensivo, catalogContent),
    ),
    intensivosHeading: content.intensivos.heading,
    teaser: {
      ...content.teaser,
      body: content.teaser.body.text,
    },
    testimonials: content.testimonials.items,
    testimonialsHeading: content.testimonials.heading,
    contactBand: content.contactBand,
    whatsappHref: whatsapp.ok ? whatsapp.value : undefined,
    instagramHref: profile.instagram.url,
    site: services.site,
    jsonLd: serializeJsonLd(
      buildLocalBusinessJsonLd(profile, services.site.baseUrl),
    ),
    metaInput: {
      title: content.seo.title,
      description: content.seo.description,
      path: "/",
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
  return [
    ...buildPageMeta(loaderData.metaInput),
    ...artDirectedPreloads(loaderData.hero.image, HERO_PRELOAD),
  ];
}

function HomePage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <>
      <HeroSection
        eyebrow={data.hero.eyebrow}
        title={
          <>
            {data.hero.title.lead.trimEnd()} <em>{data.hero.title.accent}</em>
            {data.hero.title.trail.trim()
              ? ` ${data.hero.title.trail.trimStart()}`
              : null}
          </>
        }
        subtitle={data.hero.subtitle}
        image={data.hero.image}
        bajada={data.hero.bajada}
      />
      <TrustRow claims={data.trustClaims} />
      {data.catalogFailed ? null : (
        <div className="grid gap-x-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityShowcase
              title={data.monthlyHeading}
              items={data.monthly}
              emptyMessage={data.monthlyMessage}
              emptyAction={{
                href: data.whatsappHref ?? data.instagramHref,
                label: data.whatsappHref
                  ? "Escribinos por WhatsApp"
                  : "Seguinos en Instagram",
              }}
            />
          </div>
          <div className="lg:border-l lg:border-tan-400 lg:pl-12">
            <UpcomingList
              title={data.intensivosHeading}
              items={data.intensivos}
              emptyAction={{
                href: data.instagramHref,
                label: "Seguinos en Instagram",
              }}
            />
          </div>
        </div>
      )}
      <AboutTeaser
        heading={data.teaser.heading}
        body={data.teaser.body}
        image={data.teaser.image}
      />
      <TestimonialsSection
        heading={data.testimonialsHeading}
        items={data.testimonials}
      />
      <ContactBand
        heading={data.contactBand.heading}
        body={data.contactBand.body}
        whatsappHref={data.whatsappHref ?? "#"}
        instagramHref={data.instagramHref}
      />
      <JsonLdScript json={data.jsonLd} />
    </>
  );
}

export default function HomeRoute() {
  return <HomePage data={useLoaderData<typeof loader>()} />;
}
