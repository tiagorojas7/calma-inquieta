import { failureResponse } from "./failure-response";

/**
 * The bodiless response for a failure no screen handles inline: denial and
 * absence keep their status, everything else fails closed as unavailable.
 */
export function enrollmentFailureResponse(failure: { readonly kind: string }) {
  if (failure.kind === "denied" || failure.kind === "not-found")
    return failureResponse({ kind: failure.kind });
  return failureResponse({ kind: "unavailable" });
}
