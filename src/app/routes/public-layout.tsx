import { Outlet, useLoaderData } from "react-router";
import { buildWhatsAppUrl } from "~/modules/site-content";
import { servicesContext } from "~/app/context";
import { PUBLIC_PAGES } from "~/app/site-map";
import { PublicPage } from "~/app/ui/templates/public-page";
import type { Route } from "./+types/public-layout";

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const profile = await services.siteContent.getBusinessProfile();
  const whatsappHref = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages.general,
  );
  return {
    wordmark: profile.name,
    whatsappHref: whatsappHref.ok ? whatsappHref.value : undefined,
    instagramHref: profile.instagram.url,
    footer: {
      address: profile.address,
      bajada: profile.bajada,
      whatsapp: profile.whatsapp,
      email: profile.email,
      phone: profile.phone,
      hours: profile.hours,
    },
  };
}

export default function PublicLayout() {
  const data = useLoaderData<typeof loader>();
  const footer = data.footer;
  const profile = {
    name: data.wordmark,
    whatsappHref: data.whatsappHref ?? "#",
    instagramHref: data.instagramHref,
    address: footer.address,
    bajada: footer.bajada,
    whatsappDisplay: footer.whatsapp.display,
    provisional: footer.whatsapp.provisional,
    ...(footer.email ? { email: footer.email } : {}),
    ...(footer.phone ? { phone: footer.phone } : {}),
    ...(footer.hours
      ? {
          hours: footer.hours
            .map(
              (hour) => `${hour.days.join(", ")} ${hour.opens}-${hour.closes}`,
            )
            .join("; "),
        }
      : {}),
  };
  return (
    <PublicPage pages={PUBLIC_PAGES} profile={profile}>
      <Outlet />
    </PublicPage>
  );
}
