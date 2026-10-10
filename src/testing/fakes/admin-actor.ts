import type { AdminAccessState, AdminActor } from "~/modules/admin-access";
export const testAdminActor = (email = "owner@example.com"): AdminActor => ({
  kind: "admin-actor",
  email,
});
export const adminAccessFor = (
  email = "owner@example.com",
): AdminAccessState => ({ kind: "admin", actor: testAdminActor(email) });
export const deniedAccess = (
  identityEmail: string | null = null,
): AdminAccessState => ({ kind: "denied", identityEmail });
