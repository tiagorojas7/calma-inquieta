import type { PolicyAcceptance } from "~/modules/enrollments";
import type { PolicyUseCases } from "~/modules/policies";

/** The field error when a form carries a version nobody published. */
export const POLICY_CHANGED_MESSAGE =
  "Las condiciones cambiaron. Volvé a leerlas y aceptalas.";

const VERSION = /^[1-9]\d{0,8}$/;

function version(form: FormData, name: string): number | undefined {
  const entry = form.get(name);
  return typeof entry === "string" && VERSION.test(entry)
    ? Number(entry)
    : undefined;
}

/**
 * The versions the form posted back. Missing or malformed ones read as
 * absent, and the service then refuses the request as unavailable: nothing is
 * stored without a record of what was accepted.
 */
export function acceptanceFrom(form: FormData): PolicyAcceptance | undefined {
  const conditionsVersion = version(form, "conditionsVersion");
  const privacyVersion = version(form, "privacyVersion");
  return conditionsVersion === undefined || privacyVersion === undefined
    ? undefined
    : { conditionsVersion, privacyVersion };
}

/**
 * The versions a public form shows and posts back, or null when the documents
 * cannot be read: the form still renders, and its submit then fails closed.
 */
export async function shownVersions(
  policies: Pick<PolicyUseCases, "current">,
): Promise<PolicyAcceptance | null> {
  try {
    const current = await policies.current();
    return current.ok
      ? {
          conditionsVersion: current.value.conditions.version,
          privacyVersion: current.value.privacy.version,
        }
      : null;
  } catch {
    return null;
  }
}
