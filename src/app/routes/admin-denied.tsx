import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { AdminDeniedPage } from "~/app/ui/admin/admin-denied-page";
import type { Route } from "./+types/admin-denied";

/**
 * Served by the Worker gate (re-dispatch of a denied `/admin` document request)
 * and answerable directly: always 403, and the email shows only for an identity
 * the gate verified.
 */
export function loader({ context }: Route.LoaderArgs) {
  const access = context.get(servicesContext).adminAccess;
  const email = access.kind === "denied" ? access.identityEmail : null;
  return data({ email }, { status: 403 });
}

export function headers() {
  return {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export default function AdminDenied() {
  const { email } = useLoaderData<typeof loader>();
  return <AdminDeniedPage email={email} />;
}
