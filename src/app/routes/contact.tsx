import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "~/app/seo/json-ld";
import { buildPageMeta } from "~/app/seo/meta";
import { ButtonLink } from "~/app/ui/atoms/button";
import { Heading } from "~/app/ui/atoms/heading";
import { Text } from "~/app/ui/atoms/text";
import { JsonLdScript } from "~/app/ui/json-ld-script";
import { ContactItem } from "~/app/ui/molecules/contact-item";
import { microcopy } from "~/app/ui/microcopy";
import {
  buildDirectionsUrl,
  buildWhatsAppUrl,
  type BusinessProfile,
} from "~/modules/site-content";
import type { Route } from "./+types/contact";

type Item = {
  id: string;
  icon: "pin" | "whatsapp" | "instagram" | "clock" | "mail";
  label: string;
  value: string;
  href?: string;
};

const DAY_LABELS = {
  Mo: "Lun",
  Tu: "Mar",
  We: "Mié",
  Th: "Jue",
  Fr: "Vie",
  Sa: "Sáb",
  Su: "Dom",
} as const;

function buildItems(profile: BusinessProfile): Item[] {
  const { address, whatsapp } = profile;
  const wa = buildWhatsAppUrl(
    whatsapp.display,
    profile.whatsappMessages.general,
  );
  return [
    {
      id: "address",
      icon: "pin",
      label: "Dirección",
      value: `${address.street}, ${address.locality}, ${address.city}`,
    },
    // The digits are printed only once the client confirmed the line.
    ...(wa.ok
      ? [
          {
            id: "whatsapp",
            icon: "whatsapp",
            label: "WhatsApp",
            value: whatsapp.provisional
              ? `${microcopy.writeUs}${microcopy.whatsappSuffix}`
              : whatsapp.display,
            href: wa.value,
          } satisfies Item,
        ]
      : []),
    {
      id: "instagram",
      icon: "instagram",
      label: "Instagram",
      value: `@${profile.instagram.handle}`,
      href: profile.instagram.url,
    },
    ...(profile.hours
      ? [
          {
            id: "hours",
            icon: "clock",
            label: "Horarios",
            value: profile.hours
              .map(
                (spec) =>
                  `${spec.days.map((day) => DAY_LABELS[day]).join(", ")} ${spec.opens}-${spec.closes}`,
              )
              .join("; "),
          } satisfies Item,
        ]
      : []),
    ...(profile.email
      ? [
          {
            id: "email",
            icon: "mail",
            label: "Email",
            value: profile.email,
            href: `mailto:${profile.email}`,
          } satisfies Item,
        ]
      : []),
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [content, profile] = await Promise.all([
    services.siteContent.getContactPage(),
    services.siteContent.getBusinessProfile(),
  ]);
  return {
    heading: content.heading,
    intro: content.intro,
    items: buildItems(profile),
    directionsHref: buildDirectionsUrl(profile.address),
    jsonLd: serializeJsonLd(
      buildLocalBusinessJsonLd(profile, services.site.baseUrl),
    ),
    metaInput: {
      title: content.seo.title,
      description: content.seo.description,
      path: "/contacto",
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

export default function ContactRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <section className="flex max-w-prose flex-col items-start gap-6 py-section">
      <Heading level={1}>{data.heading}</Heading>
      <Text>{data.intro}</Text>
      <div className="grid w-full gap-6 sm:grid-cols-2">
        {data.items.map(({ id, ...item }) => (
          <ContactItem key={id} {...item} />
        ))}
      </div>
      <ButtonLink href={data.directionsHref} variant="outline">
        {microcopy.directions}
      </ButtonLink>
      <JsonLdScript json={data.jsonLd} />
    </section>
  );
}
