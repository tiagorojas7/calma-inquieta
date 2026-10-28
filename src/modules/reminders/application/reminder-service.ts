import { err, ok } from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import { buildWhatsAppUrl } from "~/modules/site-content";
import {
  buildReminderMessage,
  selectAudienceOrders,
  validateReminderTemplate,
  type ReminderOrder,
} from "../domain/reminder-core";
import type { ReminderOrderSource } from "./reminder-ports";
import type { ReminderRecipient, RemindersService } from "./reminders";

type MaybeActor = AdminActor | null | undefined;

/** The service contract, accepting an absent actor so it can be denied. */
export type ReminderUseCases = {
  [K in keyof RemindersService]: RemindersService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface ReminderServiceDeps {
  readonly orders: ReminderOrderSource;
}

const SAMPLE_ORDER: ReminderOrder = {
  status: "paid",
  workshopId: "",
  workshopName: "tu taller",
  period: "",
  turnoLabel: "tu turno",
  studentName: "Ana",
  studentEmail: "",
  studentPhoneDigits: "",
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Prepares WhatsApp messages for the owner to send. Nothing is stored or sent:
 * each recipient gets a `wa.me` link the owner opens with one tap.
 */
export function createRemindersService(
  deps: ReminderServiceDeps,
): ReminderUseCases {
  return {
    async options(actor) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const orders = await deps.orders.all();
      const unique = (values: readonly string[]) => [...new Set(values)];
      return ok({
        periods: unique(orders.map((o) => o.period))
          .sort()
          .reverse(),
        turnos: unique(orders.map((o) => o.turnoLabel)).sort((a, b) =>
          a.localeCompare(b, "es"),
        ),
      });
    },

    async prepare(actor, request) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const template = validateReminderTemplate(request.kind, request.inputs);
      if (!template.ok) return template;

      const selected = selectAudienceOrders(
        await deps.orders.all(),
        request.filter,
        request.kind,
      );
      const seen = new Set<string>();
      const recipients: ReminderRecipient[] = [];
      for (const order of selected) {
        const message = buildReminderMessage(template.value, order);
        const key = `${normalizeEmail(order.studentEmail)}\n${message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const link = buildWhatsAppUrl(order.studentPhoneDigits, message);
        recipients.push({
          name: order.studentName,
          email: normalizeEmail(order.studentEmail),
          message,
          link: link.ok ? link.value : null,
        });
      }
      recipients.sort(
        (a, b) =>
          a.name.localeCompare(b.name, "es") ||
          a.email.localeCompare(b.email) ||
          a.message.localeCompare(b.message, "es"),
      );
      return ok({
        preview:
          recipients[0]?.message ??
          buildReminderMessage(template.value, SAMPLE_ORDER),
        recipients,
      });
    },
  };
}

/** Every call fails closed as unavailable once the actor is authorized. */
export function createUnavailableRemindersService(): ReminderUseCases {
  const fail = (actor: MaybeActor) => {
    const authorized = requireAdminActor(actor);
    return Promise.resolve(
      authorized.ok ? err({ kind: "unavailable" as const }) : authorized,
    );
  };
  return { options: fail, prepare: fail };
}
