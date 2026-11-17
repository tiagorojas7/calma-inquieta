import {
  dateLabel,
  dateTimeLabel,
  monthLabel,
} from "~/app/enrollment/order-labels";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { formatPesos } from "~/modules/enrollments";
import type {
  NotificationsView,
  NoveltyItem,
  PendingPaymentItem,
} from "~/modules/insights";

const copy = adminMicrocopy.notifications;

export interface NoveltyCard {
  readonly key: string;
  /** The admin page that opens the request, and so marks it read. */
  readonly href: string;
  readonly name: string;
  readonly kind: NoveltyItem["kind"];
  readonly kindLabel: string;
  /** The workshop and month, or the date a private event asks for. */
  readonly detail: string | null;
  readonly receivedAt: string;
}

export interface PaymentCard {
  readonly key: string;
  readonly href: string;
  readonly name: string;
  readonly kind: PendingPaymentItem["kind"];
  readonly owedLabel: string;
  readonly amount: string;
  readonly detail: string | null;
}

export interface NotificationsScreen {
  readonly unseen: number;
  readonly novelties: readonly NoveltyCard[];
  readonly payments: readonly PaymentCard[];
}

/** The page that lists the reservations of a workshop; the workshops list when it is gone. */
const reservationsHref = (intensiveId: string | null): string =>
  intensiveId === null
    ? "/admin/intensivos"
    : `/admin/intensivos/${intensiveId}/reservas`;

/** The workshop name, with the month when there is one. */
function workshopDetail(
  workshopName: string | null,
  period: string | null,
): string | null {
  if (workshopName === null) return null;
  return period === null
    ? workshopName
    : `${workshopName} · ${monthLabel(period)}`;
}

function noveltyCard(item: NoveltyItem): NoveltyCard {
  const href =
    item.kind === "enrollment"
      ? `/admin/inscripciones/${item.id}`
      : item.kind === "workshop-request"
        ? reservationsHref(item.intensiveId)
        : `/admin/eventos/${item.id}`;
  return {
    key: `${item.kind}:${item.id}`,
    href,
    name: item.name,
    kind: item.kind,
    kindLabel: copy.kinds[item.kind],
    detail:
      item.kind === "private-event"
        ? item.eventDate === null
          ? null
          : `${copy.forDate}: ${dateLabel(item.eventDate)}`
        : workshopDetail(item.workshopName, item.period),
    receivedAt: dateTimeLabel(item.requestedAt),
  };
}

function paymentCard(item: PendingPaymentItem): PaymentCard {
  const href =
    item.kind === "workshop-deposit" || item.kind === "workshop-balance"
      ? reservationsHref(item.intensiveId)
      : `/admin/inscripciones/${item.id}`;
  return {
    key: `${item.kind}:${item.id}`,
    href,
    name: item.name,
    kind: item.kind,
    owedLabel: copy.owed[item.kind],
    amount: formatPesos(item.amount),
    detail: workshopDetail(item.workshopName, item.period),
  };
}

/** What the novelties screen shows: plain strings and links, no due dates. */
export function toNotificationsScreen(
  view: NotificationsView,
): NotificationsScreen {
  return {
    unseen: view.unseen,
    novelties: view.novelties.map(noveltyCard),
    payments: view.pendingPayments.map(paymentCard),
  };
}

/**
 * Marks what an owner just opened as read. It only ever degrades: a mark that
 * fails or is refused must never fail the page she asked for, so the outcome
 * is dropped (nothing about the request or the error is logged).
 */
export async function markOpened(mark: () => Promise<unknown>): Promise<void> {
  try {
    await mark();
  } catch {
    // The request stays unread; the next visit tries again.
  }
}
