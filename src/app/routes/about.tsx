import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildPageMeta } from "~/app/seo/meta";
import { Heading } from "~/app/ui/atoms/heading";
import { VideoFacade } from "~/app/ui/molecules/video-facade";
import { AboutIntro } from "~/app/ui/organisms/about-intro";
import { FaqList } from "~/app/ui/organisms/faq-list";
import { GalleryGrid } from "~/app/ui/organisms/gallery-grid";
import { Reveal } from "~/app/ui/organisms/reveal";
import { Section } from "~/app/ui/organisms/section";
import { ValuesRow } from "~/app/ui/organisms/values-row";
import type { Route } from "./+types/about";

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [content, profile] = await Promise.all([
    services.siteContent.getAboutPage(),
    services.siteContent.getBusinessProfile(),
  ]);
  return {
    heading: content.heading,
    history: content.history.map(({ id, text }) => ({ id, text })),
    valueProposition: content.valueProposition.text,
    pullQuote: content.pullQuote.text,
    introImages: content.introImages,
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

function AboutPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <>
      <AboutIntro
        heading={data.heading}
        paragraphs={data.history.map((entry) => entry.text)}
        valueProposition={data.valueProposition}
        pullQuote={data.pullQuote}
        images={data.introImages}
      />
      <ValuesRow heading={data.sectionHeadings.values} items={data.values} />
      <GalleryGrid
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
    </>
  );
}

export default function AboutRoute() {
  return <AboutPage data={useLoaderData<typeof loader>()} />;
}
