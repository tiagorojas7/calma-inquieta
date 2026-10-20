import { isRouteErrorResponse } from "react-router";

/** HTTP status behind a route error; anything unexpected is a plain 500. */
export function adminErrorStatus(error: unknown): number {
  return isRouteErrorResponse(error) ? error.status : 500;
}
