import { acceptanceLabel } from "~/app/admin/acceptance-label";
import { formatEventDate, formatPesos } from "~/app/catalog/format";
import { dateLabel, dateTimeLabel } from "~/app/enrollment/order-labels";
import type {
  IntensiveRequestGroup,
  IntensiveRequestRow,
} from "~/app/ui/admin/intensive-requests";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import type { Money } from "~/modules/_shared";
import {
  balanceDue,
  INTENSIVE_REQUEST_STATUSES,
  totalPaid,
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

/** Whole pesos as a form field prefills them. */
const pesosInput = (amount: Money): string => String(amount.toCentavos() / 100);

function requestRow(
  request: StoredIntensiveRequest,
  projectNames: ReadonlyMap<string, string>,
  workshop: { readonly price: Money; readonly deposit: Money },
): IntensiveRequestRow {
  const whatsapp = buildWhatsAppUrl(request.phoneDigits, "");
  // The terms the person was quoted; a request made before projects existed
  // has no snapshot and keeps the workshop terms.
  const price = request.price ?? workshop.price;
  const deposit = request.deposit ?? workshop.deposit;
  const due = balanceDue(price, deposit);
  const paid = totalPaid({
    status: request.status,
    deposit: request.paidAmount,
    depositPaidOn: request.paidOn,
    balance: request.balance?.amount ?? null,
    balancePaidOn: request.balance?.paidOn ?? null,
  });
  return {
    id: request.id,
    name: request.fullName,
    email: request.email,
    phone: request.phoneDigits,
    whatsappHref: whatsapp.ok ? whatsapp.value : undefined,
    projectName:
      request.projectId === null
        ? null
        : (projectNames.get(request.projectId) ?? null),
    reference: request.publicId.slice(0, REFERENCE_LENGTH),
    receivedAt: dateTimeLabel(request.createdAt),
    acceptance: acceptanceLabel(request.acceptance),
    price: formatPesos(price),
    deposit: formatPesos(deposit),
    depositInput: pesosInput(deposit),
    balanceDue: due.isZero() || due.isNegative() ? null : formatPesos(due),
    balanceInput: pesosInput(due),
    balance:
      request.balance === null
        ? null
        : {
            amount: formatPesos(request.balance.amount),
            paidOn: dateLabel(request.balance.paidOn),
            note: request.balance.note,
            by: byAt(request.balance.by, request.balance.at),
          },
    paidTotal: paid.isZero() ? null : formatPesos(paid),
    paidTotalInput: pesosInput(paid),
    refund:
      request.refund === null
        ? null
        : {
            amount: formatPesos(request.refund.amount),
            refundedOn: dateLabel(request.refund.refundedOn),
            note: request.refund.note,
          },
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
  const projectNames = new Map(
    intensivo.projects.map((project) => [project.id, project.name]),
  );
  return {
    intensivo: {
      id: intensivo.id,
      name: intensivo.name,
      dateLine: formatEventDate(intensivo.eventDate),
      deposit: formatPesos(intensivo.deposit),
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
        .map((request) => requestRow(request, projectNames, intensivo)),
    })),
  };
}
