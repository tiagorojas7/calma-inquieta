import {
  isPrivateEventStatus,
  PRIVATE_EVENT_STATUSES,
  type PrivateEvent,
  type PrivateEventFilter,
} from "~/modules/private-events";
import { buildWhatsAppUrl } from "~/modules/site-content";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { dateLabel, dateTimeLabel } from "~/app/enrollment/order-labels";

const copy = adminMicrocopy.privateEvents;

export const PRIVATE_EVENT_STATUS_OPTIONS = PRIVATE_EVENT_STATUSES.map(
  (value) => ({ value, label: copy.status[value] }),
);

/** `?estado=` as a repository filter; anything unknown shows every status. */
export function parsePrivateEventFilter(
  value: string | null,
): PrivateEventFilter {
  return value !== null && isPrivateEventStatus(value) ? value : "all";
}

export function privateEventRow(request: PrivateEvent) {
  return {
    id: request.id,
    receivedOn: dateTimeLabel(request.createdAt).slice(0, 10),
    name: request.fullName,
    desiredDate: dateLabel(request.desiredDate),
    place: request.place,
    participants: request.participants,
    status: request.status,
    statusLabel: copy.status[request.status],
  };
}

export function privateEventDetail(request: PrivateEvent) {
  const whatsapp = buildWhatsAppUrl(request.phoneDigits, "");
  return {
    id: request.id,
    name: request.fullName,
    phone: request.phoneDigits,
    whatsappHref: whatsapp.ok ? whatsapp.value : undefined,
    email: request.email,
    desiredDate: dateLabel(request.desiredDate),
    place: request.place,
    participants: request.participants,
    notes: request.notes,
    receivedAt: dateTimeLabel(request.createdAt),
    status: request.status,
    statusLabel: copy.status[request.status],
    statusChanged:
      request.statusChangedBy !== null && request.statusChangedAt !== null
        ? `${request.statusChangedBy}, ${dateTimeLabel(request.statusChangedAt)}`
        : null,
    statusOptions: PRIVATE_EVENT_STATUS_OPTIONS,
  };
}
