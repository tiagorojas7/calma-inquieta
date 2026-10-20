import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "~/app/seo/json-ld";
import { imagePreload } from "~/app/media/preload";
import { buildPageMeta } from "~/app/seo/meta";
import { JsonLdScript } from "~/app/ui/json-ld-script";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { PublicCatalogService } from "~/modules/workshops";
import {
  intensivoToUpcomingItem,
  tallerToActivityCard,
} from "~/app/catalog/mappers";
import { BotanicalSprig } from "~/app/ui/atoms/botanical-sprig";
import { AboutTeaser } from "~/app/ui/organisms/about-teaser";
import { ActivityShowcase } from "~/app/ui/organisms/activity-showcase";
import { ContactBand } from "~/app/ui/organisms/contact-band";
import {
  HERO_LEAD_RESPONSIVE_SIZES,
  HeroSection,
} from "~/app/ui/organisms/hero-section";
import { HomeCatalogLead } from "~/app/ui/organisms/home-catalog-lead";
import { Reveal } from "~/app/ui/organisms/reveal";
import { Section } from "~/app/ui/organisms/section";
import { TestimonialsSection } from "~/app/ui/organisms/testimonials-section";
import { TrustRow } from "~/app/ui/organisms/trust-row";
import { UpcomingList } from "~/app/ui/organisms/upcoming-list";
import type { Route } from "./+types/home";

const INICIO_ACTIVITY_LIMIT = 3;

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
    catalogBand: content.catalogBand,
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
  const { collage } = loaderData.hero;
  const [lead] = collage;
  return [
    ...buildPageMeta(loaderData.metaInput),
    ...(lead ? [imagePreload(lead, HERO_LEAD_RESPONSIVE_SIZES)] : []),
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
        collage={data.hero.collage}
        note={data.hero.note}
        keywords={data.hero.keywords}
        loop={data.hero.loop}
        bajada={data.hero.bajada}
      />
      <TrustRow claims={data.trustClaims} />
      <Section bleed tone="canvas" spacing="md" className="overflow-x-clip">
        <BotanicalSprig
          size="md"
          variant="wheat"
          className="absolute -top-14 right-6 rotate-12 lg:right-24"
        />
        <HomeCatalogLead
          heading={data.catalogBand.heading}
          body={data.catalogBand.body}
          primary={data.catalogBand.primary}
          secondary={data.catalogBand.secondary}
          whatsappHref={data.whatsappHref}
        />
        {data.catalogFailed ? null : (
          <div className="mt-12 grid gap-x-12 lg:mt-16 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
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
            </Reveal>
            <Reveal
              index={1}
              className="lg:border-l lg:border-tan-400 lg:pl-12"
            >
              <UpcomingList
                title={data.intensivosHeading}
                items={data.intensivos}
                emptyAction={{
                  href: data.instagramHref,
                  label: "Seguinos en Instagram",
                }}
              />
            </Reveal>
          </div>
        )}
      </Section>
      <AboutTeaser
        heading={data.teaser.heading}
        body={data.teaser.body}
        image={data.teaser.image}
        accentImage={data.teaser.accentImage}
        pull={data.teaser.pull}
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
        image={data.contactBand.image}
      />
      <JsonLdScript json={data.jsonLd} />
    </>
  );
}

export default function HomeRoute() {
  return <HomePage data={useLoaderData<typeof loader>()} />;
}
