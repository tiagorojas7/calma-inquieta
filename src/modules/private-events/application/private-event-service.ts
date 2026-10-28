import {
  err,
  ok,
  type Clock,
  type Denied,
  type Invalid,
  type NotFound,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import { toWhatsAppDigits } from "~/modules/site-content";
import {
  cordobaDateOf,
  validatePrivateEventDraft,
  type PrivateEventDraft,
  type PrivateEventField,
  type PrivateEventStatus,
} from "../domain/private-event-core";
import type {
  PrivateEventFilter,
  PrivateEventRepository,
  StoredPrivateEvent,
} from "./private-event-repository";

type MaybeActor = AdminActor | null | undefined;

export type PrivateEvent = StoredPrivateEvent;

export interface PrivateEventUseCases {
  /**
   * Public: records a request. A filled honeypot answers like success without
   * storing anything, so a bot learns nothing.
   */
  requestEvent(
    draft: PrivateEventDraft,
  ): Promise<Result<{ readonly received: true }, Invalid<PrivateEventField>>>;
  list(
    actor: MaybeActor,
    filter?: PrivateEventFilter,
  ): Promise<Result<readonly PrivateEvent[], Denied>>;
  get(
    actor: MaybeActor,
    id: string,
  ): Promise<Result<PrivateEvent, Denied | NotFound>>;
  setStatus(
    actor: MaybeActor,
    id: string,
    status: PrivateEventStatus,
  ): Promise<Result<PrivateEvent, Denied | NotFound>>;
}

export interface PrivateEventServiceDeps {
  readonly repository: PrivateEventRepository;
  readonly clock: Clock;
  readonly newId?: () => string;
}

const phoneDigits = (display: string): string | null => {
  const digits = toWhatsAppDigits(display);
  return digits.ok ? digits.value : null;
};

/** Public request and admin inbox use cases for private events. */
export function createPrivateEventService(
  deps: PrivateEventServiceDeps,
): PrivateEventUseCases {
  const { repository, clock } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());

  return {
    async requestEvent(draft) {
      const now = clock.now();
      const valid = validatePrivateEventDraft(
        draft,
        phoneDigits,
        cordobaDateOf(now),
      );
      if (!valid.ok) {
        if (valid.error.kind === "honeypot") return ok({ received: true });
        return err(valid.error);
      }
      await repository.insert({
        id: newId(),
        ...valid.value,
        status: "nueva",
        createdAt: now,
        statusChangedBy: null,
        statusChangedAt: null,
      });
      return ok({ received: true });
    },

    async list(actor, filter = "all") {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return ok(await repository.list(filter));
    },

    async get(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const found = await repository.findById(id);
      return found ? ok(found) : err({ kind: "not-found" });
    },

    async setStatus(actor, id, status) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const updated = await repository.setStatus(id, status, {
        by: authorized.value.email,
        at: clock.now(),
      });
      return updated ? ok(updated) : err({ kind: "not-found" });
    },
  };
}
