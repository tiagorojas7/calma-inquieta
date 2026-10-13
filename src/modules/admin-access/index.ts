export { requireAdminActor } from "./application/admin-actor";
export type { AdminActor, AdminAccessState } from "./application/admin-actor";
export { createAuthorizeAdminRequest } from "./application/authorize-admin";
export type {
  AdminDecision,
  AuthorizeAdminRequest,
} from "./application/authorize-admin";
export {
  decodeAccessToken,
  isAllowlisted,
  isSameOriginMutation,
  normalizeAllowlist,
} from "./domain/access-authorization";
export type {
  AccessSignatureVerifier,
  AdminAccessConfig,
  DecodedAccessToken,
  DenialReason,
  SignatureVerdict,
} from "./domain/access-authorization";
