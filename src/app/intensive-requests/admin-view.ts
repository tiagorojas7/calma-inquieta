import { formatEventDate, formatPesos } from "~/app/catalog/format";
import { dateLabel, dateTimeLabel } from "~/app/enrollment/order-labels";
import type {
  IntensiveRequestGroup,
  IntensiveRequestRow,
} from "~/app/ui/admin/intensive-requests";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import {
  INTENSIVE_REQUEST_STATUSES,
  type AdminIntensiveOverview,
  type StoredIntensiveRequest,
} from "~/modules/intensive-requests";
import { buildWhatsAppUrl } from "~/modules/site-content";

const REFERENCE_LENGTH = 8;

const copy = adminMicrocopy.intensiveRequests;

/** "who, when" of a status change, on the Córdoba wall clock. */
function byAt(by: string | null, at: Date | null): string | null {
  return by !== null && at !== null ? `${by}, ${dateTimeLabel(at)}` : null;
}

function requestRow(request: StoredIntensiveRequest): IntensiveRequestRow {
  const whatsapp = buildWhatsAppUrl(request.phoneDigits, "");
  return {
    id: request.id,
    name: request.fullName,
    email: request.email,
    phone: request.phoneDigits,
    whatsappHref: whatsapp.ok ? whatsapp.value : undefined,
    reference: request.publicId.slice(0, REFERENCE_LENGTH),
    receivedAt: dateTimeLabel(request.createdAt),
    paidAmount:
      request.paidAmount === null ? null : formatPesos(request.paidAmount),
    paidOn: request.paidOn === null ? null : dateLabel(request.paidOn),
    paymentNote: request.paymentNote,
    confirmedBy: byAt(request.confirmedBy, request.confirmedAt),
    cancelReason: request.cancelReason,
    cancelledBy: byAt(request.cancelledBy, request.cancelledAt),
  };
}

/** Plain, serializable data for the reservations screen of one intensivo. */
export function intensiveRequestsView(
  overview: AdminIntensiveOverview,
  today: string,
) {
  const { intensivo } = overview;
  return {
    intensivo: {
      id: intensivo.id,
      name: intensivo.name,
      dateLine: formatEventDate(intensivo.eventDate),
      deposit: formatPesos(intensivo.deposit),
      /** Whole pesos as the confirm form prefills them. */
      depositInput: String(intensivo.deposit.toCentavos() / 100),
      today,
      seats: copy.seatsValue
        .replace("{confirmed}", String(overview.confirmedSeats))
        .replace("{capacity}", String(intensivo.capacity)),
      minSeats: String(intensivo.minSeats),
    },
    groups: INTENSIVE_REQUEST_STATUSES.map((status): IntensiveRequestGroup => ({
      status,
      title: copy.groups[status],
      rows: overview.requests
        .filter((request) => request.status === status)
        .map(requestRow),
    })),
  };
}
