import {
  err,
  ok,
  type Clock,
  type Denied,
  type Invalid,
  type Result,
  type Unavailable,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  validatePolicyBody,
  type PolicyBodyField,
  type PolicyKind,
  type PolicyVersion,
} from "../domain/policy-core";
import type { PolicyRepository } from "./policy-repository";

type MaybeActor = AdminActor | null | undefined;

/** The version of each document a visitor reads and accepts today. */
export interface CurrentPolicies {
  readonly conditions: PolicyVersion;
  readonly privacy: PolicyVersion;
}

/** Two owners kept publishing the same number at once; nothing was stored. */
export type PolicyConflict = { readonly kind: "conflict" };

export interface PolicyUseCases {
  /** Public: the latest version of each document. */
  current(): Promise<Result<CurrentPolicies, Unavailable>>;
  /** The versions of one document, newest first. */
  history(
    actor: MaybeActor,
    kind: PolicyKind,
  ): Promise<Result<readonly PolicyVersion[], Denied>>;
  /**
   * Adds the next version of a document. A blank text, or one identical to
   * the current version, is refused; the earlier versions are never touched.
   */
  publish(
    actor: MaybeActor,
    kind: PolicyKind,
    body: string,
  ): Promise<
    Result<PolicyVersion, Denied | Invalid<PolicyBodyField> | PolicyConflict>
  >;
  /**
   * Whether `version` of `kind` was ever published (not only the current one:
   * a visitor may have loaded a form before a newer version came out). A store
   * failure rejects, so callers decide how to fail.
   */
  isPublished(kind: PolicyKind, version: number): Promise<boolean>;
}

export interface PolicyServiceDeps {
  readonly repository: PolicyRepository;
  readonly clock: Clock;
  readonly newId?: () => string;
}

/** Tries the next number, and once more when another owner took it first. */
const PUBLISH_ATTEMPTS = 2;

export function createPoliciesService(deps: PolicyServiceDeps): PolicyUseCases {
  const { repository, clock } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());

  return {
    async current() {
      try {
        const [conditions, privacy] = await Promise.all([
          repository.latest("conditions"),
          repository.latest("privacy"),
        ]);
        return conditions !== null && privacy !== null
          ? ok({ conditions, privacy })
          : err({ kind: "unavailable" });
      } catch {
        return err({ kind: "unavailable" });
      }
    },

    async history(actor, kind) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return ok(await repository.list(kind));
    },

    async publish(actor, kind, body) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      for (let attempt = 0; attempt < PUBLISH_ATTEMPTS; attempt += 1) {
        const latest = await repository.latest(kind);
        const text = validatePolicyBody(body, latest?.body ?? null);
        if (!text.ok) return text;
        const inserted = await repository.insert({
          id: newId(),
          kind,
          version: (latest?.version ?? 0) + 1,
          body: text.value,
          publishedAt: clock.now(),
          publishedBy: authorized.value.email,
        });
        if (inserted.ok) return inserted;
      }
      return err({ kind: "conflict" });
    },

    isPublished: (kind, version) => repository.exists(kind, version),
  };
}

/** The service for tests and deployments without a database. */
export function createUnavailablePoliciesService(): PolicyUseCases {
  return {
    current: () => Promise.resolve(err({ kind: "unavailable" })),
    history: (actor) => {
      const authorized = requireAdminActor(actor);
      return Promise.resolve(authorized.ok ? ok([]) : authorized);
    },
    publish: (actor) => {
      const authorized = requireAdminActor(actor);
      return Promise.resolve(
        authorized.ok ? err({ kind: "conflict" as const }) : authorized,
      );
    },
    isPublished: () => Promise.reject(new Error("policies unavailable")),
  };
}
