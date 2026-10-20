import { data, type RouterContextProvider } from "react-router";
import {
  isSameOriginMutation,
  requireAdminActor,
  type AdminActor,
} from "~/modules/admin-access";
import { servicesContext } from "~/app/context";

/**
 * Layer 2 of the admin gate (design AC4). The Worker already refuses
 * non-admins before React Router runs; this re-checks inside the router so
 * a route that skips the Worker (or a gate defect) still fails closed.
 * Throws a bodiless 403 unless the request carries an admin actor and, for
 * mutations, passes the same-origin rule.
 */
export function requireAdmin(
  request: Request,
  context: Readonly<RouterContextProvider>,
): AdminActor {
  const access = context.get(servicesContext).adminAccess;
  const actor = requireAdminActor(
    access.kind === "admin" ? access.actor : null,
  );
  const sameOrigin = isSameOriginMutation({
    method: request.method,
    url: request.url,
    origin: request.headers.get("Origin"),
    secFetchSite: request.headers.get("Sec-Fetch-Site"),
  });
  if (!actor.ok || !sameOrigin) throw data(null, { status: 403 });
  return actor.value;
}
