import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "~/app/seo/json-ld";
import { buildPageMeta } from "~/app/seo/meta";
import { JsonLdScript } from "~/app/ui/json-ld-script";
import { microcopy } from "~/app/ui/microcopy";
import { ContactSection } from "~/app/ui/organisms/contact-section";
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
    photo: content.photo,
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
    <>
      <ContactSection
        heading={data.heading}
        intro={data.intro}
        photo={data.photo}
        items={data.items}
        directionsHref={data.directionsHref}
      />
      <JsonLdScript json={data.jsonLd} />
    </>
  );
}
