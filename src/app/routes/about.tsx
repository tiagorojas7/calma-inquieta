import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildPageMeta } from "~/app/seo/meta";
import { BotanicalSprig } from "~/app/ui/atoms/botanical-sprig";
import { ButtonLink } from "~/app/ui/atoms/button";
import { Butterfly } from "~/app/ui/atoms/butterfly";
import { Heading } from "~/app/ui/atoms/heading";
import { Text } from "~/app/ui/atoms/text";
import { VideoFacade } from "~/app/ui/molecules/video-facade";
import { AboutIntro } from "~/app/ui/organisms/about-intro";
import { FaqList } from "~/app/ui/organisms/faq-list";
import { GalleryCarousel } from "~/app/ui/organisms/gallery-carousel";
import { Reveal } from "~/app/ui/organisms/reveal";
import { Section } from "~/app/ui/organisms/section";
import { ValuesRow } from "~/app/ui/organisms/values-row";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { Route } from "./+types/about";

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [content, profile, home] = await Promise.all([
    services.siteContent.getAboutPage(),
    services.siteContent.getBusinessProfile(),
    services.siteContent.getHomePage(),
  ]);
  const whatsapp = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages.talleres,
  );
  return {
    heading: content.heading,
    history: content.history.map(({ id, text }) => ({ id, text })),
    valueProposition: content.valueProposition.text,
    pullQuote: content.pullQuote.text,
    introImages: content.introImages,
    introLoops: content.introLoops,
    // The closing booking band reuses the Inicio invitation and the talleres inquiry.
    cta: {
      heading: home.contactBand.heading,
      body: home.contactBand.body,
      whatsappHref: whatsapp.ok ? whatsapp.value : undefined,
    },
    values: content.values.map(({ id, title, text }) => ({ id, title, text })),
    gallery: content.gallery,
    videos: content.videos,
    faq: content.faq.map(({ id, question, answer }) => ({
      id,
      question,
      answer,
    })),
    sectionHeadings: content.sectionHeadings,
    metaInput: {
      title: content.seo.title,
      description: content.seo.description,
      path: "/quienes-somos",
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

const lightFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas";

/**
 * Closing band on deep clay: the page ends where a visitor can act, with the
 * catalog first and a WhatsApp inquiry second, both restyled for the dark ground.
 */
function BookingBand({
  heading,
  body,
  whatsappHref,
}: {
  heading: string;
  body: string;
  whatsappHref?: string | undefined;
}) {
  return (
    <Section bleed tone="clay" spacing="lg" className="overflow-x-clip">
      <Butterfly size="xl" className="right-2 top-6 lg:right-24 lg:top-8" />
      <BotanicalSprig
        size="lg"
        variant="olive"
        light
        className="absolute -top-14 left-6 lg:bottom-0 lg:left-auto lg:right-72 lg:top-auto"
      />
      <Reveal className="flex max-w-prose flex-col items-start gap-4 max-lg:mt-28">
        <Heading level={2}>{heading}</Heading>
        <Text>{body}</Text>
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink
            href="/talleres"
            className={`bg-canvas! text-clay-800! hover:bg-sand-100! ${lightFocus}`}
          >
            Ver talleres
          </ButtonLink>
          {whatsappHref ? (
            <ButtonLink
              href={whatsappHref}
              variant="tertiary"
              className={`text-canvas! ${lightFocus}`}
            >
              Escribinos por WhatsApp
            </ButtonLink>
          ) : null}
        </div>
      </Reveal>
    </Section>
  );
}

function AboutPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <>
      <AboutIntro
        heading={data.heading}
        paragraphs={data.history.map((entry) => entry.text)}
        valueProposition={data.valueProposition}
        pullQuote={data.pullQuote}
        images={data.introImages}
        loops={data.introLoops}
      />
      <ValuesRow heading={data.sectionHeadings.values} items={data.values} />
      <GalleryCarousel
        heading={data.sectionHeadings.gallery}
        images={data.gallery}
      />
      {data.videos.length > 0 && (
        <Section bleed tone="sand" spacing="lg">
          <div className="flex flex-col gap-8">
            {/* The gallery heading names this section only when no images carry it. */}
            {!data.gallery.length && (
              <Heading level={2}>{data.sectionHeadings.gallery}</Heading>
            )}
            <ul className="grid gap-6 md:grid-cols-2">
              {data.videos.map((video, at) => (
                <Reveal as="li" key={video.id} index={at}>
                  <div className="card-hover rounded-sm">
                    <VideoFacade video={video} />
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </Section>
      )}
      <FaqList heading={data.sectionHeadings.faq} items={data.faq} />
      <BookingBand
        heading={data.cta.heading}
        body={data.cta.body}
        whatsappHref={data.cta.whatsappHref}
      />
    </>
  );
}

export default function AboutRoute() {
  return <AboutPage data={useLoaderData<typeof loader>()} />;
}
