import { ok, type Clock, type Money } from "~/modules/_shared";
import { formatPesos, monthLabel } from "~/modules/enrollments";
import {
  classTomorrowEmail,
  enrollmentReceivedEmail,
  eventInquiryEmail,
  feePendingEmail,
  paymentConfirmedEmail,
  type EmailContent,
  type EventInquiryInput,
} from "../domain/email-templates";
import type {
  AudienceOrder,
  EmailSender,
  NotificationAudience,
} from "./notification-ports";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const CORDOBA_OFFSET_MS = 3 * HOUR_MS;
/** A pending order is reminded once, by the first daily run that finds it this old. */
export const FEE_REMINDER_AFTER_HOURS = 48;
const FEE_REMINDER_WINDOW_HOURS = 24;

/** What an order email needs; carries the student's address. */
export interface OrderNotice {
  readonly studentEmail: string;
  readonly studentName: string;
  readonly number: string;
  readonly publicId: string;
  readonly workshopName: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoLabel: string;
  readonly total: Money;
}

export interface ReminderRunSummary {
  readonly classes: number;
  readonly fees: number;
  readonly failed: number;
}

/**
 * Every method resolves: a failed email must never break the flow that
 * triggered it. Failures are reported by name through `onFailure`.
 */
export interface NotificationService {
  enrollmentReceived(order: OrderNotice): Promise<void>;
  paymentConfirmed(order: OrderNotice): Promise<void>;
  privateEventReceived(inquiry: EventInquiryInput): Promise<void>;
  /** Class-tomorrow and pending-fee reminders; meant to run once a day. */
  runDailyReminders(): Promise<ReminderRunSummary>;
}

export interface NotificationServiceDeps {
  /** False wires a silent service: nothing is read and nothing is sent. */
  readonly enabled: boolean;
  readonly sender: EmailSender;
  readonly audience: NotificationAudience;
  readonly clock: Clock;
  readonly siteUrl: string;
  /** The studio inbox, or null when it is not confirmed. */
  readonly studioEmail: () => Promise<string | null>;
  readonly onFailure?: (name: string) => void;
}

/** Tomorrow's Córdoba (UTC-03:00) ISO weekday (1 = Monday) and `YYYY-MM`. */
function tomorrowInCordoba(now: Date): { weekday: number; period: string } {
  const tomorrow = new Date(now.getTime() - CORDOBA_OFFSET_MS + DAY_MS);
  const day = tomorrow.getUTCDay();
  return {
    weekday: day === 0 ? 7 : day,
    period: tomorrow.toISOString().slice(0, 7),
  };
}

export function createNotificationService(
  deps: NotificationServiceDeps,
): NotificationService {
  const report = (name: string) => {
    try {
      deps.onFailure?.(name);
    } catch {
      // Reporting a failure must not fail the flow either.
    }
  };

  /** Resolves true when the message was accepted by the sender. */
  async function deliver(to: string, content: EmailContent): Promise<boolean> {
    try {
      const sent = await deps.sender.send({ to, ...content });
      if (sent.ok) return true;
      report(sent.error.kind);
    } catch {
      report("send-threw");
    }
    return false;
  }

  async function readAudience(
    read: () => Promise<readonly AudienceOrder[]>,
  ): Promise<readonly AudienceOrder[]> {
    try {
      return await read();
    } catch {
      report("audience-failed");
      return [];
    }
  }

  const orderUrl = (publicId: string) =>
    `${deps.siteUrl.replace(/\/+$/, "")}/pedido/${publicId}`;

  const orderInput = (order: {
    studentName: string;
    number: string;
    publicId: string;
    workshopName: string;
    period: string;
    turnoLabel: string;
    total: Money;
  }) => ({
    studentName: order.studentName,
    number: order.number,
    workshopName: order.workshopName,
    periodLabel: monthLabel(order.period),
    turnoLabel: order.turnoLabel,
    total: formatPesos(order.total),
    orderUrl: orderUrl(order.publicId),
  });

  return {
    async enrollmentReceived(order) {
      if (!deps.enabled) return;
      await deliver(
        order.studentEmail,
        enrollmentReceivedEmail(orderInput(order)),
      );
    },

    async paymentConfirmed(order) {
      if (!deps.enabled) return;
      await deliver(
        order.studentEmail,
        paymentConfirmedEmail(orderInput(order)),
      );
    },

    async privateEventReceived(inquiry) {
      if (!deps.enabled) return;
      let studio: string | null;
      try {
        studio = await deps.studioEmail();
      } catch {
        report("studio-address-failed");
        return;
      }
      if (studio === null) return;
      await deliver(studio, eventInquiryEmail(inquiry));
    },

    async runDailyReminders() {
      if (!deps.enabled) return { classes: 0, fees: 0, failed: 0 };
      const now = deps.clock.now();
      const tomorrow = tomorrowInCordoba(now);
      let classes = 0;
      let fees = 0;
      let failed = 0;

      const classOrders = await readAudience(() =>
        deps.audience.classesOn(tomorrow.weekday, tomorrow.period),
      );
      for (const order of classOrders) {
        const sent = await deliver(
          order.studentEmail,
          classTomorrowEmail({
            studentName: order.studentName,
            workshopName: order.workshopName,
            turnoLabel: order.turnoLabel,
            startsAt: order.startsAt.slice(0, 5),
          }),
        );
        if (sent) classes += 1;
        else failed += 1;
      }

      const feeOrders = await readAudience(() =>
        deps.audience.pendingRequestedBetween(
          new Date(
            now.getTime() -
              (FEE_REMINDER_AFTER_HOURS + FEE_REMINDER_WINDOW_HOURS) * HOUR_MS,
          ),
          new Date(now.getTime() - FEE_REMINDER_AFTER_HOURS * HOUR_MS),
        ),
      );
      for (const order of feeOrders) {
        const sent = await deliver(
          order.studentEmail,
          feePendingEmail(orderInput(order)),
        );
        if (sent) fees += 1;
        else failed += 1;
      }
      return { classes, fees, failed };
    },
  };
}

/** The sender wired when email is not configured. */
export function createDisabledEmailSender(): EmailSender {
  return { send: () => Promise.resolve(ok(undefined)) };
}
