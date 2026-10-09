import { useLoaderData } from "react-router";
import { buildWhatsAppUrl } from "~/modules/site-content";
import { servicesContext } from "~/app/context";
import { ComingSoonPage } from "~/app/ui/templates/coming-soon-page";
import type { Route } from "./+types/coming-soon";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const query = request.url.indexOf("?");
  const pathname = request.url.slice(
    request.url.lastIndexOf("/") + 1,
    query === -1 ? request.url.length : query,
  );
  const slug = ((params as { slug?: string }).slug ?? pathname) as
    "talleres" | "intensivos" | "eventos-privados";
  const [page, profile] = await Promise.all([
    services.siteContent.getComingSoonPage(slug),
    services.siteContent.getBusinessProfile(),
  ]);
  const whatsappHref = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages[slug],
  );
  return {
    ...page,
    slug,
    whatsappHref: whatsappHref.ok ? whatsappHref.value : undefined,
    instagramHref: profile.instagram.url,
  };
}

export default function ComingSoonRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <ComingSoonPage
      title={data.title}
      message={data.message}
      whatsappHref={data.whatsappHref ?? "#"}
      instagramHref={data.instagramHref}
    />
  );
}
