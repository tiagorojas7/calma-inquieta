/**
 * A step of the one-click taller flow that stopped, carried as a bounded
 * `?fallo=<step>` query parameter on the redirect to the taller. Only steps
 * the screen declares are honored, so the page never renders text from the URL.
 */
export const FAILURE_STEPS = [
  "turnos",
  "publish",
  "month",
  "materials",
  "enroll",
] as const;

export type FailureStep = (typeof FAILURE_STEPS)[number];

export function failureStep(request: Request): FailureStep | null {
  const value = new URL(request.url).searchParams.get("fallo");
  return FAILURE_STEPS.find((step) => step === value) ?? null;
}

/** `path` with the failed step appended. */
export function withFailure(path: string, step: FailureStep): string {
  return `${path}${path.includes("?") ? "&" : "?"}fallo=${step}`;
}
