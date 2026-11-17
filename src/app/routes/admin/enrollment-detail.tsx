import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { isUuid } from "~/app/admin/enrollment-ids";
import {
  cancelRefundValues,
  parseCancelRefund,
  refundFieldError,
} from "~/app/admin/enrollment-cancel-form-data";
import {
  correctionFieldErrors,
  parseCorrectionForm,
} from "~/app/admin/enrollment-correction-form-data";
import { encodeOffer } from "~/app/admin/enrollment-new-form-data";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import {
  enrollmentCorrectionRefusal,
  enrollmentFailureResponse,
} from "~/app/admin/enrollment-failure";
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
import type {
  CorrectionHistoryEntry,
  CorrectionSummary,
} from "~/app/ui/admin/enrollment-correction";
import { EnrollmentDetail } from "~/app/ui/admin/enrollment-detail";
import { Money } from "~/modules/_shared";
import {
  formatPesos,
  fulfillmentOf,
  type CorrectionSnapshot,
  type OrderCorrection,
} from "~/modules/enrollments";
import type { AppServices } from "~/composition/request-services";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-detail";

export function meta() {
  return [{ title: "Inscripción | Panel | Calma Inquieta" }];
}

const CORDOBA_OFFSET_MS = 10_800_000;
const FEEDBACK = [
  "confirmed",
  "cancelled",
  "corrected",
  "returned-to-pending",
  "materials-requested",
  "materials-received",
  "sale-created",
] as const;

/** The Córdoba calendar day of an instant, as the day label wants it. */
const cordobaDay = (instant: Date) =>
  new Date(instant.getTime() - CORDOBA_OFFSET_MS).toISOString().slice(0, 10);

function lineTotal(unit: Money, quantity: number): string {
  return formatPesos(unit.multiply(quantity));
}

type Actor = Parameters<AppServices["monthlyWorkshops"]["list"]>[0];

/**
 * Every live workshop x open month x turno that still takes enrollments, the
 * same choices as a new enrollment. A failure to read them leaves the list
 * empty: the owner can still correct the fee, and the order stays readable.
 */
async function loadCorrectionOptions(services: AppServices, actor: Actor) {
  const options: { value: string; label: string }[] = [];
  try {
    const workshops = await services.monthlyWorkshops.list(actor, {
      status: "live",
    });
    if (!workshops.ok) return options;
    for (const summary of workshops.value) {
      if (!summary.acceptsNewRequests) continue;
      const [workshop, periods] = await Promise.all([
        services.monthlyWorkshops.get(actor, summary.id),
        services.workshopPeriods.list(actor, summary.id),
      ]);
      if (!workshop.ok || !periods.ok) continue;
      for (const period of periods.value.periods) {
        if (period.status !== "open" || period.activeTurnos === 0) continue;
        const offer = await services.publicEnrollments.getOffer({
          slug: workshop.value.slug,
          period: period.period,
        });
        if (!offer.ok) continue;
        for (const turno of offer.value.turnos)
          options.push({
            value: encodeOffer({
              slug: workshop.value.slug,
              period: period.period,
              turnoId: turno.id,
            }),
            label: `${summary.name} · ${monthLabel(period.period)} · ${turno.label}`,
          });
      }
    }
  } catch {
    return [];
  }
  return options;
}

const summaryOf = (snapshot: CorrectionSnapshot): CorrectionSummary => ({
  workshop: snapshot.workshopName,
  month: monthLabel(snapshot.period),
  turno: `${snapshot.turnoLabel} · ${formatTimeRange(snapshot.startsAt, snapshot.endsAt)}`,
  fee: formatPesos(snapshot.fee),
  total: formatPesos(snapshot.total),
});

const dayOf = (instant: Date) => dateLabel(instant.toISOString().slice(0, 10));

function historyEntry(correction: OrderCorrection): CorrectionHistoryEntry {
  const outcome =
    correction.refund !== null
      ? "lowered"
      : correction.before.status === "pending_confirmation"
        ? "kept-pending"
        : correction.after.status === "pending_confirmation"
          ? "returned-to-pending"
          : "kept-paid";
  return {
    at: dateTimeLabel(correction.at),
    actor: correction.actor,
    note: correction.note,
    outcome,
    before: summaryOf(correction.before),
    after: summaryOf(correction.after),
    previousPayment:
      correction.previousPayment === null
        ? null
        : {
            amount: formatPesos(correction.previousPayment.amount),
            paidOn: dayOf(correction.previousPayment.paidAt),
            confirmedBy: correction.previousPayment.confirmedBy,
          },
    refund:
      correction.refund === null
        ? null
        : {
            amount: formatPesos(correction.refund.amount),
            refundedOn: dayOf(correction.refund.refundedAt),
            note: correction.refund.note,
          },
  };
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const services = context.get(servicesContext);
  const found = await services.enrollments.detail(actor, params.id);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  const order = found.value;
  const paid = order.paidAt !== undefined && order.paidAmount !== undefined;
  const fulfillment = fulfillmentOf(order.lines);
  // A sale shares its record's student, workshop and month, but has no seat,
  // fee or turno of its own to correct.
  const isSale = order.kind === "material_sale";
  return {
    kind: isSale ? ("material_sale" as const) : ("enrollment" as const),
    parent:
      isSale && order.parent !== undefined
        ? {
            number: order.parent.number,
            href: `/admin/inscripciones/${order.parent.id}`,
          }
        : null,
    sales: (order.sales ?? []).map((sale) => ({
      id: sale.id,
      number: sale.number,
      href: `/admin/inscripciones/${sale.id}`,
      status: sale.status,
      statusLabel: ORDER_STATUS_LABELS[sale.status],
      total: formatPesos(sale.total),
      requestedOn: dateLabel(cordobaDay(sale.requestedAt)),
    })),
    newSaleHref:
      !isSale && order.status !== "cancelled"
        ? `/admin/inscripciones/${order.id}/venta-nueva`
        : null,
    feedback: feedbackCode(request, FEEDBACK),
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
    totalPesos: String(order.total.toCentavos() / 100),
    lines: order.lines.map((line) => ({
      label: `${line.materialName} ${line.variantLabel}`,
      supplier: line.supplierName,
      quantity: line.quantity,
      unitPrice: formatPesos(line.unitPrice),
      lineTotal: lineTotal(line.unitPrice, line.quantity),
      ...(line.source === undefined ? {} : { source: line.source }),
    })),
    payment: paid
      ? {
          paidOn: dateLabel(order.paidAt.toISOString().slice(0, 10)),
          amount: formatPesos(order.paidAmount),
          confirmedBy: order.confirmedBy ?? "",
          note: order.paymentNote ?? null,
        }
      : null,
    cancelRefund:
      paid && order.status !== "cancelled"
        ? {
            paid: formatPesos(order.paidAmount),
            paidPesos: String(order.paidAmount.toCentavos() / 100),
          }
        : null,
    refund: order.refund
      ? {
          amount: formatPesos(order.refund.amount),
          refundedOn: dateLabel(
            order.refund.refundedAt.toISOString().slice(0, 10),
          ),
          note: order.refund.note ?? null,
          refundedBy: order.refund.refundedBy,
        }
      : null,
    seat: order.seat,
    correction:
      order.status === "cancelled" || isSale
        ? null
        : {
            options: await loadCorrectionOptions(services, actor),
            feePesos: String(order.fee.toCentavos() / 100),
            paid: paid ? formatPesos(order.paidAmount) : null,
          },
    corrections: order.corrections.map(historyEntry),
    audit: order.audit.map((entry) => ({
      at: dateTimeLabel(entry.at),
      actor: entry.actor,
      from: entry.from === null ? null : ORDER_STATUS_LABELS[entry.from],
      to: ORDER_STATUS_LABELS[entry.to],
      note: entry.note,
    })),
    actions: {
      confirm: order.status === "pending_confirmation",
      cancel: order.status !== "cancelled",
      // A supplier line is requested first; an order served only from stock is handed over directly.
      materialsRequested:
        order.status === "paid" && fulfillment.hasSupplierLines,
      materialsReceived:
        order.status === "materials_requested" ||
        (order.status === "paid" && fulfillment.stockOnly),
    },
    today: new Date(Date.now() - CORDOBA_OFFSET_MS).toISOString().slice(0, 10),
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const enrollments = context.get(servicesContext).enrollments;
  const orderId = params.id;
  const back = (code: (typeof FEEDBACK)[number]) =>
    redirect(withFeedback(`/admin/inscripciones/${orderId}`, code));

  if (form.get("intent") === "correct") {
    const parsed = parseCorrectionForm(form, orderId);
    if (parsed.input === null)
      return data(
        { errors: parsed.errors, values: parsed.values },
        { status: 422 },
      );
    const corrected = await enrollments.correct(actor, parsed.input);
    if (corrected.ok)
      return back(
        corrected.value.outcome === "returned-to-pending"
          ? "returned-to-pending"
          : "corrected",
      );
    const errors = correctionFieldErrors(corrected.error);
    if (errors !== null)
      return data({ errors, values: parsed.values }, { status: 422 });
    const message = enrollmentCorrectionRefusal(corrected.error);
    if (message !== null) return refusalResponse(message, parsed.values);
    throw enrollmentFailureResponse(corrected.error);
  }

  const intent = parseEnrollmentIntent(form);
  if (intent === null) throw data(null, { status: 400 });

  if (intent.kind === "confirm" || intent.kind === "cancel") {
    const refund =
      intent.kind === "cancel" ? parseCancelRefund(form) : undefined;
    const values =
      intent.kind === "confirm"
        ? { amount: intent.amount, paidOn: intent.paidOn, note: intent.note }
        : { reason: intent.reason, ...cancelRefundValues(form) };
    const result =
      intent.kind === "confirm"
        ? await enrollments.confirmPayment(actor, {
            orderId,
            amount: intent.amount,
            paidOn: intent.paidOn,
            ...(intent.note === "" ? {} : { note: intent.note }),
          })
        : await enrollments.cancel(actor, {
            orderId,
            reason: intent.reason,
            ...(refund === undefined ? {} : { refund }),
          });
    if (!result.ok) {
      if (result.error.kind === "invalid")
        return data(
          { errors: enrollmentFieldErrors(result.error.issues), values },
          { status: 422 },
        );
      if (result.error.kind === "invalid-refund")
        return data(
          { errors: refundFieldError(result.error), values },
          { status: 422 },
        );
      const message = enrollmentRefusalMessage(result.error);
      if (message !== null) return refusalResponse(message, values);
      throw enrollmentFailureResponse(result.error);
    }
    const message = enrollmentRefusalMessage({ kind: result.value.kind });
    return message === null
      ? back(intent.kind === "confirm" ? "confirmed" : "cancelled")
      : refusalResponse(message, values);
  }

  const result =
    intent.kind === "materials-requested"
      ? await enrollments.markMaterialsRequested(actor, orderId)
      : await enrollments.markMaterialsReceived(actor, orderId);
  if (result.ok)
    return back(
      intent.kind === "materials-requested"
        ? "materials-requested"
        : "materials-received",
    );
  const message = enrollmentRefusalMessage(result.error);
  if (message !== null) return refusalResponse(message, {});
  throw enrollmentFailureResponse(result.error);
}

export default function AdminEnrollmentDetail() {
  const { feedback, ...order } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <EnrollmentDetail
      order={order}
      feedback={feedback}
      {...(result ? { form: result } : {})}
    />
  );
}
