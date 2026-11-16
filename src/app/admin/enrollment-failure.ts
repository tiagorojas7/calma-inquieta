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

/** Spanish refusals of a hand-made enrollment; null means the failure is not one. */
export function enrollmentCreateRefusal(failure: {
  readonly kind: string;
}): string | null {
  switch (failure.kind) {
    case "duplicate-order":
      return "Esa alumna ya tiene una inscripción este mes. Si el email y el teléfono pertenecen a alumnas distintas, revisalos.";
    case "turno-full":
      return "El turno está completo. Elegí otro turno.";
    case "period-closed":
      return "El mes ya está cerrado. Elegí otro mes.";
    case "not-found":
    case "enrollments-paused":
    case "turno-not-offered":
      return "Esa opción ya no está disponible. Elegí otra.";
    default:
      return null;
  }
}
