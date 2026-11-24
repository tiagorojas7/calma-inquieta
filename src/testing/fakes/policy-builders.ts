import { createPoliciesService, type PolicyVersion } from "~/modules/policies";
import { fixedClock } from "./fixed-clock";
import { InMemoryPolicyRepository } from "./in-memory-policy-repository";

export const POLICY_NOW = new Date("2026-11-17T15:00:00.000Z");

/** A published version, defaulting to the first conditions text. */
export function buildPolicyVersion(
  overrides: Partial<PolicyVersion> = {},
): PolicyVersion {
  const kind = overrides.kind ?? "conditions";
  const version = overrides.version ?? 1;
  return {
    id: `policy-${kind}-${String(version)}`,
    kind,
    version,
    body:
      kind === "conditions"
        ? "La cuota mensual se abona en un único pago.\n\nCada workshop también muestra sus propias condiciones."
        : "Usamos tus datos solo para gestionar tu inscripción.",
    publishedAt: new Date("2026-11-01T12:00:00.000Z"),
    publishedBy: "migration 0018",
    ...overrides,
  };
}

/**
 * The real policies service over an in-memory store that starts with version 1
 * of each document, like a migrated database. `extra` adds more versions.
 */
export function createInMemoryPolicies(extra: readonly PolicyVersion[] = []) {
  const repository = new InMemoryPolicyRepository();
  repository.versions.push(
    buildPolicyVersion({ kind: "conditions" }),
    buildPolicyVersion({ kind: "privacy" }),
    ...extra,
  );
  let counter = 0;
  const service = createPoliciesService({
    repository,
    clock: fixedClock(POLICY_NOW),
    newId: () => `policy-new-${String((counter += 1))}`,
  });
  return { service, repository };
}
