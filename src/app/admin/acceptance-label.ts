import { adminMicrocopy } from "~/app/ui/admin/microcopy";

const copy = adminMicrocopy.enrollments.detail;

/**
 * "Condiciones v2 · Privacidad v3" for the versions a person accepted, or that
 * there is no record (an order or request made before the documents were
 * versioned, or one an owner created by hand).
 */
export function acceptanceLabel(
  acceptance:
    | {
        readonly conditionsVersion: number;
        readonly privacyVersion: number;
      }
    | null
    | undefined,
): string {
  return acceptance
    ? copy.acceptanceLine(
        acceptance.conditionsVersion,
        acceptance.privacyVersion,
      )
    : copy.noAcceptance;
}
