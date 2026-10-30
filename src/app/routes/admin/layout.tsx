import {
  Outlet,
  useLoaderData,
  useLocation,
  useRouteLoaderData,
} from "react-router";
import { adminErrorStatus } from "~/app/admin/error-status";
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

export function loader({ request, context }: Route.LoaderArgs) {
  return { email: requireAdmin(request, context).email };
}

export function meta() {
  return [{ title: "Panel | Calma Inquieta" }];
}

export default function AdminLayout() {
  const { email } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  return (
    <AdminShell email={email} pathname={pathname}>
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
    <AdminShell email={data?.email ?? null} pathname={pathname}>
      <AdminErrorState status={status} retryHref={`${pathname}${search}`} />
    </AdminShell>
  );
}
