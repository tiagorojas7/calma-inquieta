import {
  isRouteErrorResponse,
  Outlet,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";
import { buildWhatsAppUrl } from "~/modules/site-content";
import { servicesContext } from "~/app/context";
import { PUBLIC_PAGES } from "~/app/site-map";
import { PublicPage } from "~/app/ui/templates/public-page";
import type { Route } from "./+types/public-layout";
import { ErrorPage } from "~/app/ui/templates/error-page";

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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const status = isRouteErrorResponse(error)
    ? error.status
    : error && typeof error === "object" && "init" in error
      ? Number((error as { init?: { status?: number } }).init?.status) || 500
      : 500;
  const data = useRouteLoaderData<typeof loader>("routes/public-layout");
  const profile = data
    ? {
        name: data.wordmark,
        whatsappHref: data.whatsappHref ?? "#",
        instagramHref: data.instagramHref,
        address: data.footer.address,
        bajada: data.footer.bajada,
        whatsappDisplay: data.footer.whatsapp.display,
        provisional: data.footer.whatsapp.provisional,
        ...(data.footer.email ? { email: data.footer.email } : {}),
        ...(data.footer.phone ? { phone: data.footer.phone } : {}),
      }
    : {
        name: "Calma Inquieta",
        whatsappHref: "#",
        instagramHref: "#",
        address: { street: "", locality: "", city: "" },
        bajada: "",
        whatsappDisplay: "",
        provisional: true,
      };
  return (
    <PublicPage pages={PUBLIC_PAGES} profile={profile}>
      <ErrorPage status={status} />
    </PublicPage>
  );
}

export default function PublicLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
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
      {children ?? <Outlet />}
    </PublicPage>
  );
}
