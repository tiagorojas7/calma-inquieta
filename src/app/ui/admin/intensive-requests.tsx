import { adminCopy } from "./copy";
import { AdminPageHeader } from "./admin-page";
import { ReservationList } from "./classes-reservations";
import { SavedBanner } from "./saved-banner";

const copy = adminCopy.clases.reservations;

/** Plain display strings of one request; the delivery layer builds them. */
export interface IntensiveRequestRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappHref: string | undefined;
  /** The project the person chose; null for a request made before projects. */
  readonly projectName: string | null;
  readonly reference: string;
  readonly receivedAt: string;
  /** "Condiciones v2 · Privacidad v3", or that there is no record. */
  readonly acceptance: string;
  /** The terms the person was quoted: price, deposit and what the deposit left. */
  readonly price: string;
  readonly deposit: string;
  /** Whole pesos, as the confirm form prefills them. */
  readonly depositInput: string;
  /** The balance still owed after the deposit; null when the deposit covered it all. */
  readonly balanceDue: string | null;
  readonly balanceInput: string;
  /** The one full balance payment, once recorded. */
  readonly balance: {
    readonly amount: string;
    readonly paidOn: string;
    readonly note: string | null;
    readonly by: string | null;
  } | null;
  /** Deposit plus balance, as text and as whole pesos for the refund form. */
  readonly paidTotal: string | null;
  readonly paidTotalInput: string;
  readonly refund: {
    readonly amount: string;
    readonly refundedOn: string;
    readonly note: string | null;
  } | null;
  readonly paidAmount: string | null;
  readonly paidOn: string | null;
  readonly paymentNote: string | null;
  readonly confirmedBy: string | null;
  readonly cancelReason: string | null;
  readonly cancelledBy: string | null;
}

export interface IntensiveRequestGroup {
  readonly status: "pending_confirmation" | "confirmed" | "cancelled";
  readonly title: string;
  readonly rows: readonly IntensiveRequestRow[];
}

export interface IntensiveRequestsViewData {
  readonly intensivo: {
    readonly id: string;
    readonly name: string;
    readonly dateLine: string;
    readonly deposit: string;
    readonly today: string;
    readonly seats: string;
    readonly minSeats: string;
  };
  readonly groups: readonly IntensiveRequestGroup[];
}

/** What a rejected form sends back: only that request's forms show it. */
export interface IntensiveRequestFeedback {
  readonly requestId: string;
  readonly intent: "confirm" | "balance" | "cancel";
  readonly formError: string | undefined;
  readonly errors: Readonly<
    Partial<
      Record<
        | "amount"
        | "paidOn"
        | "note"
        | "reason"
        | "refundAmount"
        | "refundedOn"
        | "refundNote",
        string
      >
    >
  >;
  readonly values: Readonly<Record<string, string>>;
}

/**
 * Reservations of one dated workshop, as cards. Every action is a native form
 * post that comes back to this page at the same person, and every link a plain
 * anchor: the Worker gate refuses the `.data` requests a client navigation
 * makes. The bell links here.
 */
export function IntensiveRequestsScreen({
  view,
  feedback,
  done = null,
}: {
  view: IntensiveRequestsViewData;
  feedback: IntensiveRequestFeedback | undefined;
  done?: "confirmed" | "balance" | "cancelled" | null | undefined;
}) {
  const { intensivo, groups } = view;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={`${copy.title}: ${intensivo.name}`}
        description={`${intensivo.dateLine} · ${intensivo.seats} ${copy.seatsWord}`}
        back={{ href: "/admin/clases", label: copy.back }}
      />
      <SavedBanner message={done ? adminCopy.clases.saved[done] : null} />
      <ReservationList
        intensivoId={intensivo.id}
        today={intensivo.today}
        groups={groups}
        returnTo={`/admin/intensivos/${intensivo.id}/reservas`}
        feedback={feedback}
        headingLevel={2}
        justCancelled={done === "cancelled" || feedback?.intent === "cancel"}
      />
      <a
        href={`/admin/intensivos/${intensivo.id}`}
        className="inline-flex min-h-12 items-center text-lg font-semibold text-clay-800 underline underline-offset-4"
      >
        {copy.edit}
      </a>
    </section>
  );
}
