import { monthLabel } from "~/app/enrollment/order-labels";
import type {
  StudentRecordCard,
  StudentSaleCard,
} from "~/app/ui/admin/student-detail";
import { formatPesos, type AdminEnrollmentDetail } from "~/modules/enrollments";

/** What a card needs of an order: a monthly record and a material sale read the same. */
export type SaleSource = AdminEnrollmentDetail;

/** A plain element id for a monthly record; the redirect after a save returns to it. */
export const recordAnchor = (number: string) => `r-${number.toLowerCase()}`;

/** A plain element id for a material sale. */
export const saleAnchor = (number: string) => `v-${number.toLowerCase()}`;

const pesosOf = (amount: { toCentavos(): number }) =>
  String(amount.toCentavos() / 100);

function stateOf(status: string): StudentSaleCard["state"] {
  if (status === "cancelled") return "cancelled";
  return status === "pending_confirmation" ? "owes" : "paid";
}

/** Whether the materials were handed over; nothing to say when there are none or nobody paid yet. */
function deliveryOf(order: AdminEnrollmentDetail): StudentSaleCard["delivery"] {
  if (order.lines.length === 0) return null;
  if (order.status === "materials_received") return "delivered";
  return order.status === "paid" || order.status === "materials_requested"
    ? "toDeliver"
    : null;
}

function common(order: AdminEnrollmentDetail) {
  const state = stateOf(order.status);
  const paid =
    state === "paid" && order.paidAmount !== undefined
      ? {
          paid: formatPesos(order.paidAmount),
          paidPesos: pesosOf(order.paidAmount),
        }
      : null;
  return {
    id: order.id,
    number: order.number,
    state,
    total: formatPesos(order.total),
    totalPesos: pesosOf(order.total),
    lines: order.lines.map((line) => ({
      label: `${line.materialName} ${line.variantLabel}`,
      quantity: line.quantity,
    })),
    delivery: deliveryOf(order),
    canPay: state === "owes",
    canCancel: state !== "cancelled",
    cancelRefund: paid,
  };
}

/** One material sale as it shows under its monthly record. */
export function saleCard(sale: SaleSource): StudentSaleCard {
  return { ...common(sale), anchor: saleAnchor(sale.number) };
}

/** One monthly record with the sales that belong to it. */
export function recordCard(
  record: AdminEnrollmentDetail,
  sales: readonly StudentSaleCard[],
): StudentRecordCard {
  const base = common(record);
  return {
    ...base,
    anchor: recordAnchor(record.number),
    workshop: record.workshopName,
    month: monthLabel(record.period),
    turno: record.turnoLabel,
    canSell: base.state !== "cancelled",
    sales,
  };
}
