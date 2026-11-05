import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { AdminDeniedPage } from "~/app/ui/admin/admin-denied-page";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { Route } from "./+types/admin-denied";

/** Plain links only: hydrating at the denied `/admin` URL would rebuild the admin routes. */
export const handle = { hydrate: false };

/**
 * Served by the Worker gate (re-dispatch of a denied `/admin` document request)
 * and answerable directly: always 403, and the email shows only for an identity
 * the gate verified.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const access = services.adminAccess;
  const email = access.kind === "denied" ? access.identityEmail : null;
  const profile = await services.siteContent.getBusinessProfile();
  const whatsapp = buildWhatsAppUrl(
    profile.whatsapp.display,
    adminMicrocopy.denied.whatsappMessage(email),
  );
  return data(
    { email, whatsappHref: whatsapp.ok ? whatsapp.value : null },
    { status: 403 },
  );
}

export function headers() {
  return {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export default function AdminDenied() {
  const { email, whatsappHref } = useLoaderData<typeof loader>();
  return <AdminDeniedPage email={email} whatsappHref={whatsappHref} />;
}
