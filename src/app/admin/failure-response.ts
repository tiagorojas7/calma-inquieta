import { data } from "react-router";

const STATUS = { denied: 403, unavailable: 503, "not-found": 404 } as const;

/**
 * The bodiless response a loader or action throws for a service failure. The
 * admin boundary renders it as the denial page, the construction state or a
 * generic error; no internals reach the page.
 */
export function failureResponse(failure: {
  readonly kind: keyof typeof STATUS;
}) {
  return data(null, { status: STATUS[failure.kind] });
}
