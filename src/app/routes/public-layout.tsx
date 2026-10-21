import {
  isRouteErrorResponse,
  Outlet,
  useLoaderData,
  useMatches,
  useRouteLoaderData,
} from "react-router";
import { buildDirectionsUrl, buildWhatsAppUrl } from "~/modules/site-content";
import { servicesContext } from "~/app/context";
import { PUBLIC_PAGES } from "~/app/site-map";
import { PublicPage } from "~/app/ui/templates/public-page";
import type { Route } from "./+types/public-layout";
import { ErrorPage } from "~/app/ui/templates/error-page";

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const [profile, brand] = await Promise.all([
    services.siteContent.getBusinessProfile(),
    services.siteContent.getBrand(),
  ]);
  const whatsappHref = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages.general,
  );
  return {
    wordmark: profile.name,
    whatsappHref: whatsappHref.ok ? whatsappHref.value : undefined,
    instagramHref: profile.instagram.url,
    directionsHref: buildDirectionsUrl(profile.address),
    brand,
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
        directionsHref: data.directionsHref,
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
        directionsHref: "#",
        address: { street: "", locality: "", city: "" },
        bajada: "",
        whatsappDisplay: "",
        provisional: true,
      };
  return (
    <PublicPage
      pages={PUBLIC_PAGES}
      profile={profile}
      {...(data ? { brand: data.brand } : {})}
    >
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
  const matches = useMatches();
  // A route opts in with `export const handle = { heroBackdrop: "dark-below-lg" }`.
  const heroBackdrop = matches.some(
    (match) =>
      (match.handle as { heroBackdrop?: unknown } | undefined)?.heroBackdrop ===
      "dark-below-lg",
  )
    ? ("dark-below-lg" as const)
    : undefined;
  const footer = data.footer;
  const profile = {
    name: data.wordmark,
    whatsappHref: data.whatsappHref ?? "#",
    instagramHref: data.instagramHref,
    directionsHref: data.directionsHref,
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
    <PublicPage
      pages={PUBLIC_PAGES}
      profile={profile}
      brand={data.brand}
      {...(heroBackdrop ? { heroBackdrop } : {})}
    >
      {children ?? <Outlet />}
    </PublicPage>
  );
}
