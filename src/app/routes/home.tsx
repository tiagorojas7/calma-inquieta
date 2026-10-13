import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "~/app/seo/json-ld";
import { buildPageMeta } from "~/app/seo/meta";
import { JsonLdScript } from "~/app/ui/json-ld-script";
import { buildWhatsAppUrl } from "~/modules/site-content";
import { AboutTeaser } from "~/app/ui/organisms/about-teaser";
import { ActivityShowcase } from "~/app/ui/organisms/activity-showcase";
import { ContactBand } from "~/app/ui/organisms/contact-band";
import { HeroSection } from "~/app/ui/organisms/hero-section";
import { TestimonialsSection } from "~/app/ui/organisms/testimonials-section";
import { TrustRow } from "~/app/ui/organisms/trust-row";
import { UpcomingList } from "~/app/ui/organisms/upcoming-list";
import type { Route } from "./+types/home";

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [content, profile] = await Promise.all([
    services.siteContent.getHomePage(),
    services.siteContent.getBusinessProfile(),
  ]);
  const whatsapp = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages.general,
  );
  return {
    hero: { ...content.hero, bajada: profile.bajada },
    trustClaims: content.trustClaims,
    monthly: [],
    monthlyHeading: content.monthly.heading,
    monthlyMessage: content.monthly.emptyMessage,
    intensivos: [],
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
  return buildPageMeta(loaderData.metaInput);
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
        images={data.hero.images}
        bajada={data.hero.bajada}
      />
      <TrustRow claims={data.trustClaims} />
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
      <UpcomingList
        title={data.intensivosHeading}
        items={data.intensivos}
        emptyAction={{
          href: data.instagramHref,
          label: "Seguinos en Instagram",
        }}
      />
      <AboutTeaser heading={data.teaser.heading} body={data.teaser.body} />
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
