import type { PolicyVersionCheck } from "~/modules/enrollments";
import type { PolicyUseCases } from "~/modules/policies";

/**
 * Adapts the policies module to the port both public forms use to refuse a
 * conditions or privacy version nobody published. The two modules never import
 * each other; this is the only place that knows both. A failure of the store
 * rejects, and each form maps it to its own "unavailable".
 */
export function createPolicyVersionAdapter(
  policies: Pick<PolicyUseCases, "isPublished">,
): PolicyVersionCheck {
  return {
    isPublished: (kind, version) => policies.isPublished(kind, version),
  };
}
