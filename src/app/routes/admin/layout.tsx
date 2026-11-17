import {
  Outlet,
  useLoaderData,
  useLocation,
  useRouteLoaderData,
} from "react-router";
import { adminErrorStatus } from "~/app/admin/error-status";
import { servicesContext } from "~/app/context";
import { requireAdmin } from "./require-admin";
import { AdminDeniedPage } from "~/app/ui/admin/admin-denied-page";
import { AdminErrorState } from "~/app/ui/admin/admin-error-state";
import { AdminShell } from "~/app/ui/admin/admin-shell";
import type { Route } from "./+types/layout";

/** Runs before every loader and action below, documents and `.data` alike. */
export const middleware: Route.MiddlewareFunction[] = [
  ({ request, context }) => {
    requireAdmin(request, context);
  },
];

/**
 * The number on the bell. A count that cannot be read hides the badge; it
 * never fails the page the owner asked for.
 */
async function unseenCountOf(
  context: Route.LoaderArgs["context"],
  actor: ReturnType<typeof requireAdmin>,
): Promise<number | null> {
  try {
    const counted = await context
      .get(servicesContext)
      .insights.unseenCount(actor);
    return counted.ok ? counted.value : null;
  } catch {
    return null;
  }
}

// Not `async`: a missing admin actor still throws before any read, as before.
export function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  return unseenCountOf(context, actor).then((unseen) => ({
    email: actor.email,
    unseen,
  }));
}

export function meta() {
  return [{ title: "Panel | Calma Inquieta" }];
}

export default function AdminLayout() {
  const { email, unseen } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  return (
    <AdminShell email={email} pathname={pathname} unseen={unseen}>
      <Outlet />
    </AdminShell>
  );
}

// Own boundary, no stack or internals. A 403 shows the bare denial page; any
// other error keeps the admin chrome. React Router hands an error thrown by
// this route's middleware to this same boundary (see layout.routing.test.ts).
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const status = adminErrorStatus(error);
  const data = useRouteLoaderData<typeof loader>("routes/admin/layout");
  const { pathname, search } = useLocation();
  if (status === 403) return <AdminDeniedPage email={null} />;
  return (
    <AdminShell
      email={data?.email ?? null}
      pathname={pathname}
      unseen={data?.unseen ?? null}
    >
      <AdminErrorState status={status} retryHref={`${pathname}${search}`} />
    </AdminShell>
  );
}
