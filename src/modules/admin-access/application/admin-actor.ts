import { err, ok, type Result } from "~/modules/_shared";
import type { Denied } from "~/modules/_shared/use-case-errors";

export interface AdminActor {
  readonly kind: "admin-actor";
  readonly email: string;
}
export type AdminAccessState =
  | { readonly kind: "admin"; readonly actor: AdminActor }
  | { readonly kind: "denied"; readonly identityEmail: string | null }
  | { readonly kind: "not-evaluated" };

type AdminActorCandidate = {
  readonly kind?: unknown;
  readonly email?: unknown;
};

export function requireAdminActor(
  actor: AdminActorCandidate | null | undefined,
): Result<AdminActor, Denied> {
  if (
    !actor ||
    actor.kind !== "admin-actor" ||
    typeof actor.email !== "string" ||
    actor.email.trim() === ""
  )
    return err({ kind: "denied" });
  return ok(actor as AdminActor);
}
