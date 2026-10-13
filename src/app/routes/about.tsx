import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildPageMeta } from "~/app/seo/meta";
import { Heading } from "~/app/ui/atoms/heading";
import { Text } from "~/app/ui/atoms/text";
import { FaqList } from "~/app/ui/organisms/faq-list";
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
      <section>
        <Heading level={1}>{data.heading}</Heading>
        {data.history.map((entry) => (
          <Text key={entry.id}>{entry.text}</Text>
        ))}
        <Text tone="accent">{data.valueProposition}</Text>
      </section>
      <ValuesRow heading={data.sectionHeadings.values} items={data.values} />
      {/* Gallery and videos are wired in F6. */}
      <FaqList heading={data.sectionHeadings.faq} items={data.faq} />
    </>
  );
}

export default function AboutRoute() {
  return <AboutPage data={useLoaderData<typeof loader>()} />;
}
