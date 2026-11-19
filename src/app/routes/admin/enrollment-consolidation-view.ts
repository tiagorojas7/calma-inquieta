import { data, redirect, type RouterContextProvider } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentRefusalMessage } from "~/app/admin/enrollment-action-data";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { isUuid } from "~/app/admin/enrollment-ids";
import { feedbackCode } from "~/app/admin/feedback-code";
import { stayOnPage } from "~/app/admin/return-to";
import { whatsappHref } from "~/app/admin/whatsapp-href";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { monthLabel } from "~/app/enrollment/order-labels";
import type {
  DeliveryCardView,
  OrderSupplierView,
} from "~/app/ui/admin/materials-orders";
import {
  formatPesos,
  fulfillmentOf,
  type DeliveryOrder,
} from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";

const CORDOBA_OFFSET_MS = 10_800_000;
const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_ORDERS = 200;
const MAX_WORKSHOPS = 50;

/** Where the page that shows "Para pedir" and "Para entregar" lives. */
export const MATERIALS_PATH = "/admin/materiales";
export const ORDER_ANCHOR = "para-pedir";
export const DELIVER_ANCHOR = "para-entregar";

/** The notice codes the page announces after an action, with the `n` count. */
export const CONSOLIDATION_FEEDBACK = [
  "requested",
  "received",
  "workshop-requested",
] as const;
export type ConsolidationFeedback = (typeof CONSOLIDATION_FEEDBACK)[number];

const MAX_NOTICE_COUNT = MAX_ORDERS;

type Args = {
  readonly request: Request;
  readonly context: Readonly<RouterContextProvider>;
};

export function periodOf(value: string | null): string {
  return value !== null && PERIOD_KEY.test(value)
    ? value
    : new Date(Date.now() - CORDOBA_OFFSET_MS).toISOString().slice(0, 7);
}

function cardOf(order: DeliveryOrder): DeliveryCardView {
  return {
    id: order.id,
    studentName: order.studentName,
    // A sale has no turno of its own: it names the workshop of its record.
    detail:
      order.kind === "material_sale"
        ? `${adminMicrocopy.enrollments.detail.sale.listLabel} · ${order.workshopName}`
        : `${order.workshopName} · ${order.turnoLabel}`,
    lines: order.lines.map((line) => ({
      label: `${line.materialName} ${line.variantLabel}`,
      quantity: line.quantity,
    })),
    whatsappHref: whatsappHref(order.phoneDigits),
    ...(order.status === "paid" ? { fromStock: true } : {}),
  };
}

/** Handed over from here: asked from the supplier, or paid with every line in stock. */
const toHandOver = (order: DeliveryOrder): boolean =>
  order.status === "materials_requested" ||
  (order.status === "paid" && fulfillmentOf(order.lines).stockOnly);

/** What the owner has to order and hand over in a month, ready to show. */
export async function loadConsolidation({ request, context }: Args) {
  const actor = requireAdmin(request, context);
  const params = new URL(request.url).searchParams;
  const period = periodOf(params.get("mes"));
  const count = Number(params.get("n"));
  const code = feedbackCode(request, CONSOLIDATION_FEEDBACK);
  const services = context.get(servicesContext);
  const [found, delivered] = await Promise.all([
    services.consolidation.consolidate(actor, period),
    services.consolidation.deliveries(actor, period),
  ]);
  for (const outcome of [found, delivered])
    if (!outcome.ok)
      throw outcome.error.kind === "invalid"
        ? data(null, { status: 400 })
        : enrollmentFailureResponse(outcome.error);
  if (!found.ok || !delivered.ok) throw data(null, { status: 503 });
  const consolidation = found.value;
  const toDeliver = delivered.value.filter(toHandOver).map(cardOf);
  const suppliers: OrderSupplierView[] = consolidation.suppliers.map(
    (supplier) => {
      const workshops = new Map<string, string>();
      for (const item of supplier.materials)
        if (item.originId !== undefined && item.origin !== undefined)
          workshops.set(
            item.originId,
            workshops.get(item.originId) ?? item.origin,
          );
      return {
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        materials: supplier.materials.map((item) => ({
          label: `${item.materialName} ${item.variantLabel}`,
          quantity: item.quantity,
          ...(item.origin === undefined || item.originId === undefined
            ? {}
            : { origin: item.origin, originId: item.originId }),
        })),
        total: formatPesos(supplier.total),
        summary: supplier.summary,
        orderIds: supplier.pendingRequestOrderIds,
        workshops: [...workshops].map(([id, name]) => ({ id, name })),
      };
    },
  );
  // A workshop with lines to buy counts once, like an order to request.
  const requestable = new Set(
    consolidation.suppliers.flatMap(
      (supplier) => supplier.pendingRequestOrderIds,
    ),
  );
  const workshopsToOrder = new Set(
    consolidation.suppliers.flatMap((supplier) =>
      supplier.materials.flatMap((item) =>
        item.originId === undefined ? [] : [item.originId],
      ),
    ),
  );
  return {
    period: consolidation.period,
    periodLabel: monthLabel(consolidation.period),
    counts: {
      pedir: requestable.size + workshopsToOrder.size,
      entregar: toDeliver.length,
    },
    grandTotal: formatPesos(consolidation.grandTotal),
    pendingOrders: consolidation.pendingOrders,
    notice:
      code !== null &&
      Number.isInteger(count) &&
      count > 0 &&
      count <= MAX_NOTICE_COUNT
        ? { kind: code, count }
        : null,
    suppliers,
    toDeliver,
    delivered: delivered.value
      .filter((order) => order.status === "materials_received")
      .map(cardOf),
  };
}

const INTENTS = {
  "mark-requested": { code: "requested", method: "markMaterialsRequestedBulk" },
  "mark-received": { code: "received", method: "markMaterialsReceivedBulk" },
} as const;

/** `to` with the count of what moved, before any anchor. */
export function withCount(to: string, count: number): string {
  const [base = "", anchor] = to.split("#");
  const joined = `${base}${base.includes("?") ? "&" : "?"}n=${String(count)}`;
  return anchor === undefined ? joined : `${joined}#${anchor}`;
}

function uuids(form: FormData, key: string, max: number): string[] {
  return [
    ...new Set(
      form
        .getAll(key)
        .filter((id): id is string => typeof id === "string" && isUuid(id)),
    ),
  ].slice(0, max);
}

function refusalText(failures: readonly { readonly kind: string }[]): string {
  return [
    ...new Set(
      failures.map(
        (failure) =>
          enrollmentRefusalMessage(failure) ??
          "No pudimos completar la acción. Probá de nuevo.",
      ),
    ),
  ].join(" ");
}

/**
 * The posts of "Para pedir" and "Para entregar", from this page or from the
 * old Materiales page: each goes back to the page it came from, at its card,
 * with how many moved. `mark-supplier-requested` marks, in one press, the
 * monthly orders and the workshop lines a supplier is owed.
 */
export async function consolidationAction({ request, context }: Args) {
  const actor = requireAdmin(request, context);
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const intent = form.get("intent");
  const rawPeriod = form.get("mes");
  const period = periodOf(typeof rawPeriod === "string" ? rawPeriod : null);
  const services = context.get(servicesContext);
  const fallback = `${MATERIALS_PATH}?mes=${period}`;
  const back = (code: ConsolidationFeedback, count: number, anchor: string) => {
    if (!form.get("anchor")) form.set("anchor", anchor);
    const to = stayOnPage(form, { fallback, code });
    return redirect(count > 0 ? withCount(to, count) : to);
  };

  if (intent === "mark-workshop-requested") {
    const workshopId = form.get("workshopId");
    const supplierId = form.get("supplierId");
    if (
      typeof workshopId !== "string" ||
      typeof supplierId !== "string" ||
      !isUuid(workshopId) ||
      !isUuid(supplierId)
    )
      throw data(null, { status: 400 });
    const marked = await services.consolidation.markWorkshopOrdered(
      actor,
      workshopId,
      supplierId,
    );
    if (!marked.ok) throw enrollmentFailureResponse(marked.error);
    // Pressed again (or by the other owner meanwhile): nothing moved, no notice.
    return marked.value.count === 0
      ? redirect(stayOnPageWithoutCode(form, fallback, ORDER_ANCHOR))
      : back("workshop-requested", marked.value.count, ORDER_ANCHOR);
  }

  if (intent === "mark-supplier-requested") {
    const supplierId = form.get("supplierId");
    const orderIds = uuids(form, "orderId", MAX_ORDERS);
    const workshopIds = uuids(form, "workshopId", MAX_WORKSHOPS);
    if (orderIds.length === 0 && workshopIds.length === 0)
      return data(
        { formError: "No hay pedidos para marcar." },
        { status: 422 },
      );
    if (
      workshopIds.length > 0 &&
      (typeof supplierId !== "string" || !isUuid(supplierId))
    )
      throw data(null, { status: 400 });
    const outcomes =
      orderIds.length > 0
        ? await services.enrollments.markMaterialsRequestedBulk(actor, orderIds)
        : [];
    const failures: { readonly kind: string }[] = outcomes.flatMap((outcome) =>
      outcome.result.ok ? [] : [outcome.result.error],
    );
    let moved = outcomes.length - failures.length;
    for (const workshopId of workshopIds) {
      const marked = await services.consolidation.markWorkshopOrdered(
        actor,
        workshopId,
        supplierId as string,
      );
      if (marked.ok) moved += marked.value.count;
      else if (marked.error.kind === "denied")
        throw enrollmentFailureResponse(marked.error);
      else failures.push(marked.error);
    }
    if (failures.length === 0) return back("requested", moved, ORDER_ANCHOR);
    const denied = failures.find((failure) => failure.kind === "denied");
    if (denied) throw enrollmentFailureResponse(denied);
    return data(
      {
        formError: `Se marcaron ${String(moved)}. ${refusalText(failures)}`,
      },
      { status: 409 },
    );
  }

  if (intent !== "mark-requested" && intent !== "mark-received")
    throw data(null, { status: 400 });
  const { code, method } = INTENTS[intent];
  const orderIds = uuids(form, "orderId", MAX_ORDERS);
  if (orderIds.length === 0)
    return data({ formError: "No hay pedidos para marcar." }, { status: 422 });

  const outcomes = await services.enrollments[method](actor, orderIds);
  const failures = outcomes.flatMap((outcome) =>
    outcome.result.ok ? [] : [outcome.result.error],
  );
  const done = outcomes.length - failures.length;
  if (failures.length === 0)
    return back(
      code,
      done,
      intent === "mark-received" ? DELIVER_ANCHOR : ORDER_ANCHOR,
    );

  const denied = failures.find((failure) => failure.kind === "denied");
  if (denied) throw enrollmentFailureResponse(denied);
  return data(
    {
      formError: `Se marcaron ${String(done)} de ${String(outcomes.length)} pedidos. ${refusalText(failures)}`,
    },
    { status: 409 },
  );
}

function stayOnPageWithoutCode(
  form: FormData,
  fallback: string,
  anchor: string,
): string {
  if (!form.get("anchor")) form.set("anchor", anchor);
  return stayOnPage(form, { fallback });
}
