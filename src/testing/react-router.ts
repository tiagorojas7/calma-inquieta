import { RouterContextProvider } from "react-router";
import { servicesContext } from "~/app/context";
import type { AppServices } from "~/composition/request-services";

/**
 * Builds the argument object React Router passes to a loader, so loaders are
 * tested as plain functions. The context holds fake services (design 6.2).
 */
export function createLoaderArgs(
  services: AppServices,
  path = "/status",
): {
  request: Request;
  params: Record<string, never>;
  context: RouterContextProvider;
} {
  const context = new RouterContextProvider();
  context.set(servicesContext, services);
  return {
    request: new Request(`http://localhost${path}`),
    params: {},
    context,
  };
}
