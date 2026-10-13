import type { Clock } from "~/modules/_shared";
import {
  checkAccessClaims,
  decodeAccessToken,
  isAllowlisted,
  normalizeAllowlist,
  readAccessIdentity,
  type AccessSignatureVerifier,
  type AdminAccessConfig,
  type DenialReason,
} from "../domain/access-authorization";
import type { AdminActor } from "./admin-actor";

export type AdminDecision =
  | { readonly kind: "admin"; readonly actor: AdminActor }
  | {
      readonly kind: "denied";
      readonly reason: DenialReason;
      /** Set only for a verified identity (or the dev identity). */
      readonly identityEmail: string | null;
    };
export type AuthorizeAdminRequest = (evidence: {
  readonly assertion: string | null;
}) => Promise<AdminDecision>;

export function createAuthorizeAdminRequest(deps: {
  readonly config: AdminAccessConfig;
  readonly signatures: AccessSignatureVerifier;
  readonly clock: Clock;
}): AuthorizeAdminRequest {
  const { config, signatures, clock } = deps;
  const deny = (
    reason: DenialReason,
    identityEmail: string | null = null,
  ): AdminDecision => ({ kind: "denied", reason, identityEmail });
  const admit = (email: string): AdminDecision =>
    isAllowlisted(email, config.adminEmails)
      ? { kind: "admin", actor: { kind: "admin-actor", email } }
      : deny("not-allowlisted", email);

  return async ({ assertion }) => {
    try {
      const unusable = () =>
        deny(config.hasIssues ? "config-invalid" : "config-missing");
      if (normalizeAllowlist(config.adminEmails).size === 0) return unusable();
      const devEmail = config.devAdminEmail?.trim().toLowerCase();
      if (devEmail) return admit(devEmail);
      if (!config.access) return unusable();
      if (!assertion?.trim()) return deny("token-missing");

      const decoded = decodeAccessToken(assertion);
      if (!decoded.ok) return deny(decoded.error);
      const { claims } = decoded.value;
      const nowSeconds = Math.floor(clock.now().getTime() / 1000);
      const timed = checkAccessClaims(claims, { ...config.access, nowSeconds });
      if (!timed.ok) return deny(timed.error);
      const identity = readAccessIdentity(claims);
      if (!identity.ok) return deny(identity.error);

      const verdict = await signatures
        .verify(decoded.value)
        .catch(() => "invalid" as const);
      if (verdict === "valid") return admit(identity.value);
      return deny(verdict === "invalid" ? "signature" : verdict);
    } catch {
      return deny("config-invalid");
    }
  };
}
