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

/**
 * The month-based policy version stored before the documents were versioned.
 * It only says something true for a web order with no recorded versions: an
 * order an owner created by hand (its creation was logged by her, not by
 * "public") accepted nothing, and one with versions has them in the acceptance
 * line instead.
 */
export function legacyPolicyVersion(order: {
  readonly policyVersion: string;
  readonly acceptance?: unknown;
  readonly audit: readonly {
    readonly from: unknown;
    readonly actor: string;
  }[];
}): string | null {
  if (order.acceptance) return null;
  const created = order.audit.find((entry) => entry.from === null);
  return created?.actor === "public" ? order.policyVersion : null;
}
