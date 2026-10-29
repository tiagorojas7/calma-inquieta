import type {
  AdminEnrollmentUseCases,
  PublicEnrollmentUseCases,
} from "~/modules/enrollments";
import type { IntensiveRequestUseCases } from "~/modules/intensive-requests";
import type { NotificationService } from "~/modules/notifications";
import type { PrivateEventUseCases } from "~/modules/private-events";

/** Hands a promise to the runtime (`waitUntil`) so it outlives the response. */
export type Defer = (pending: Promise<unknown>) => void;

/**
 * Sending an email is a side effect after the main write, never part of it:
 * each decorator runs the inner use case first, returns its result untouched
 * and defers the email. A rejection of the deferred work is swallowed here
 * (the notification service already reports failures by name).
 */
function schedule(defer: Defer, work: () => Promise<unknown>): void {
  defer(work().catch(() => undefined));
}

export function withEnrollmentEmails(
  inner: PublicEnrollmentUseCases,
  notifier: NotificationService,
  defer: Defer,
): PublicEnrollmentUseCases {
  return {
    ...inner,
    async requestEnrollment(input) {
      const result = await inner.requestEnrollment(input);
      // The honeypot answers with a decoy that has no number and was never stored.
      if (result.ok && result.value.number !== "") {
        const order = result.value;
        schedule(defer, () =>
          notifier.enrollmentReceived({
            studentEmail: input.student.email.trim(),
            studentName: order.studentName,
            number: order.number,
            publicId: order.publicId,
            workshopName: order.workshopName,
            period: order.period,
            turnoLabel: order.turnoLabel,
            total: order.total,
          }),
        );
      }
      return result;
    },
  };
}

export function withPaymentEmails(
  inner: AdminEnrollmentUseCases,
  notifier: NotificationService,
  defer: Defer,
): AdminEnrollmentUseCases {
  return {
    ...inner,
    async confirmPayment(actor, input) {
      const result = await inner.confirmPayment(actor, input);
      if (result.ok && result.value.kind === "confirmed") {
        schedule(defer, async () => {
          const found = await inner.detail(actor, input.orderId);
          if (!found.ok) return;
          const order = found.value;
          await notifier.paymentConfirmed({
            studentEmail: order.email,
            studentName: order.student.fullName,
            number: order.number,
            publicId: order.publicId,
            workshopName: order.workshopName,
            period: order.period,
            turnoLabel: order.turnoLabel,
            total: order.total,
          });
        });
      }
      return result;
    },
  };
}

export function withPrivateEventEmails(
  inner: PrivateEventUseCases,
  notifier: NotificationService,
  defer: Defer,
): PrivateEventUseCases {
  return {
    ...inner,
    async requestEvent(draft) {
      const result = await inner.requestEvent(draft);
      // A filled honeypot answers like a success without storing anything.
      if (result.ok && draft.honeypot.trim() === "") {
        schedule(defer, () =>
          notifier.privateEventReceived({
            fullName: draft.fullName.trim(),
            phone: draft.phone.trim(),
            email: draft.email.trim() === "" ? null : draft.email.trim(),
            desiredDate: draft.desiredDate.trim(),
            place: draft.place.trim(),
            participants: Number.parseInt(draft.participants, 10),
            notes: draft.notes.trim() === "" ? null : draft.notes.trim(),
          }),
        );
      }
      return result;
    },
  };
}

export function withIntensiveRequestEmails(
  inner: IntensiveRequestUseCases,
  notifier: NotificationService,
  defer: Defer,
): IntensiveRequestUseCases {
  /** The public summary carries the intensivo name, date and deposit. */
  async function notice(publicId: string, studentEmail: string) {
    const found = await inner.getRequestByPublicId(publicId);
    if (!found.ok) return null;
    const view = found.value;
    return {
      studentEmail,
      studentName: view.studentName,
      publicId: view.publicId,
      intensivoName: view.intensivoName,
      eventDate: view.eventDate,
      deposit: view.deposit,
    };
  }

  return {
    ...inner,
    async requestSeat(input) {
      const result = await inner.requestSeat(input);
      // A filled honeypot answers with a decoy id that was never stored.
      if (result.ok && input.student.honeypot.trim() === "") {
        const { publicId } = result.value;
        schedule(defer, async () => {
          const data = await notice(publicId, input.student.email.trim());
          if (data) await notifier.intensiveRequestReceived(data);
        });
      }
      return result;
    },
    async confirm(actor, input) {
      const result = await inner.confirm(actor, input);
      if (result.ok) {
        const { publicId, email } = result.value;
        schedule(defer, async () => {
          const data = await notice(publicId, email);
          if (data) await notifier.intensiveReservationConfirmed(data);
        });
      }
      return result;
    },
  };
}
