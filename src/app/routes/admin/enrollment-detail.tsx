import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import {
  enrollmentFieldErrors,
  enrollmentRefusalMessage,
  parseEnrollmentIntent,
  refusalResponse,
} from "~/app/admin/enrollment-action-data";
import { formatTimeRange } from "~/app/catalog/format";
import {
  dateLabel,
  dateTimeLabel,
  monthLabel,
  ORDER_STATUS_LABELS,
} from "~/app/enrollment/order-labels";
import { EnrollmentDetail } from "~/app/ui/admin/enrollment-detail";
import { Money } from "~/modules/_shared";
import { formatPesos } from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-detail";

export function meta() {
  return [{ title: "Inscripción | Panel | Calma Inquieta" }];
}

const CORDOBA_OFFSET_MS = 10_800_000;

function lineTotal(unit: Money, quantity: number): string {
  return formatPesos(unit.multiply(quantity));
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const found = await context
    .get(servicesContext)
    .enrollments.detail(actor, params.id);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  const order = found.value;
  const paid = order.paidAt !== undefined && order.paidAmount !== undefined;
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    studentName: order.student.fullName,
    email: order.email,
    phone: order.phoneDigits,
    workshopName: order.workshopName,
    month: monthLabel(order.period),
    turno: `${order.turnoLabel} · ${formatTimeRange(order.startsAt, order.endsAt)}`,
    requestedAt: dateTimeLabel(order.requestedAt),
    policyVersion: order.policyVersion,
    fee: formatPesos(order.fee),
    materialsTotal: formatPesos(order.materialsTotal),
    total: formatPesos(order.total),
    lines: order.lines.map((line) => ({
      label: `${line.materialName} ${line.variantLabel}`,
      supplier: line.supplierName,
      quantity: line.quantity,
      unitPrice: formatPesos(line.unitPrice),
      lineTotal: lineTotal(line.unitPrice, line.quantity),
    })),
    payment: paid
      ? {
          paidOn: dateLabel(order.paidAt.toISOString().slice(0, 10)),
          amount: formatPesos(order.paidAmount),
          confirmedBy: order.confirmedBy ?? "",
          note: order.paymentNote ?? null,
        }
      : null,
    seat: order.seat,
    audit: order.audit.map((entry) => ({
      at: dateTimeLabel(entry.at),
      actor: entry.actor,
      from: entry.from === null ? null : ORDER_STATUS_LABELS[entry.from],
      to: ORDER_STATUS_LABELS[entry.to],
      note: entry.note,
    })),
    actions: {
      confirm: order.status === "pending_confirmation",
      cancel:
        order.status === "pending_confirmation" || order.status === "paid",
      materialsRequested: order.status === "paid" && order.lines.length > 0,
      materialsReceived: order.status === "materials_requested",
    },
    today: new Date(Date.now() - CORDOBA_OFFSET_MS).toISOString().slice(0, 10),
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const intent = parseEnrollmentIntent(form);
  if (intent === null) throw data(null, { status: 400 });
  const enrollments = context.get(servicesContext).enrollments;
  const orderId = params.id;
  const back = redirect(`/admin/inscripciones/${orderId}`);

  if (intent.kind === "confirm" || intent.kind === "cancel") {
    const values =
      intent.kind === "confirm"
        ? { amount: intent.amount, paidOn: intent.paidOn, note: intent.note }
        : { reason: intent.reason };
    const result =
      intent.kind === "confirm"
        ? await enrollments.confirmPayment(actor, {
            orderId,
            amount: intent.amount,
            paidOn: intent.paidOn,
            ...(intent.note === "" ? {} : { note: intent.note }),
          })
        : await enrollments.cancel(actor, { orderId, reason: intent.reason });
    if (!result.ok) {
      if (result.error.kind === "invalid")
        return data(
          { errors: enrollmentFieldErrors(result.error.issues), values },
          { status: 422 },
        );
      const message = enrollmentRefusalMessage(result.error);
      if (message !== null) return refusalResponse(message, values);
      throw enrollmentFailureResponse(result.error);
    }
    const message = enrollmentRefusalMessage({ kind: result.value.kind });
    return message === null ? back : refusalResponse(message, values);
  }

  const result =
    intent.kind === "materials-requested"
      ? await enrollments.markMaterialsRequested(actor, orderId)
      : await enrollments.markMaterialsReceived(actor, orderId);
  if (result.ok) return back;
  const message = enrollmentRefusalMessage(result.error);
  if (message !== null) return refusalResponse(message, {});
  throw enrollmentFailureResponse(result.error);
}

export default function AdminEnrollmentDetail() {
  const order = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <EnrollmentDetail order={order} {...(result ? { form: result } : {})} />
  );
}
